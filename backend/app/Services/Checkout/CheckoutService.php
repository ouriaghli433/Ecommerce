<?php

namespace App\Services\Checkout;

use App\Models\Address;
use App\Models\Cart;
use App\Models\Order;
use App\Models\User;
use App\Services\Coupon\CouponService;
use App\Services\Inventory\InventoryService;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Turns the active cart into an order (RG16).
 *
 * Everything below happens inside ONE database transaction, so the order, its
 * lines, the stock reservation and the cart status are either all saved or
 * none of them are. Inventory rows are locked before they are read, always in
 * the same order (by product id), which keeps two parallel checkouts from
 * deadlocking each other.
 */
class CheckoutService
{
    public function __construct(
        private InventoryService $inventory,
        private CouponService $coupons,
    ) {}

    public function checkout(User $user, Address $address, ?string $couponCode = null): Order
    {
        return DB::transaction(function () use ($user, $address, $couponCode) {
            $cart = $this->activeCartWithLines($user);

            // 1. Lock the stock of every product in the cart (same order every time).
            $productIds = $cart->lines->pluck('product_id')->all();
            $inventories = $this->inventory->lockInventories($productIds);

            // 2. Check each line and build the order lines with today's price.
            $orderLines = [];
            $subtotal = 0;

            foreach ($cart->lines as $line) {
                $product = $line->product;

                if (! $product->is_active) {
                    throw ValidationException::withMessages([
                        'cart' => "{$product->name} is no longer available.",
                    ]);
                }

                $inventory = $inventories->get($product->id);
                $available = $inventory ? $inventory->on_hand - $inventory->reserved : 0;

                if ($line->quantity > $available) {
                    throw ValidationException::withMessages([
                        'cart' => "Only {$available} left in stock for {$product->name}.",
                    ]);
                }

                // The price is read again here, so an old cart cannot buy at an old price.
                $subtotal += $product->price * $line->quantity;

                $orderLines[] = [
                    'product_id' => $product->id,
                    'quantity' => $line->quantity,
                    'unit_price' => $product->price,
                ];
            }

            // 3. Coupon (locked and checked on the server, RG38-RG40).
            $coupon = null;
            $discount = 0;

            if ($couponCode) {
                $coupon = $this->coupons->lockAndValidate($couponCode, $user, $subtotal);
                $discount = $this->coupons->discountFor($coupon, $subtotal);
            }

            // 4. Amounts.
            $afterDiscount = $subtotal - $discount;
            $shipping = $afterDiscount >= config('shop.free_shipping_from')
                ? 0
                : config('shop.shipping_amount');
            $tax = (int) round($afterDiscount * config('shop.tax_percent') / 100);
            $total = $afterDiscount + $shipping + $tax;

            // 5. The order, with a frozen copy of the delivery address (RG19).
            $order = Order::create([
                'user_id' => $user->id,
                'coupon_id' => $coupon?->id,
                'shipping_address_id' => $address->id,
                'status' => 'pending_payment',
                'subtotal' => $subtotal,
                'discount_amount' => $discount,
                'shipping_amount' => $shipping,
                'tax_amount' => $tax,
                'total_amount' => $total,
                'currency' => config('shop.currency'),
                'expires_at' => now()->addMinutes(config('shop.payment_window_minutes')),
                'shipping_full_name' => $address->full_name,
                'shipping_phone' => $address->phone,
                'shipping_address_line' => $address->address_line,
                'shipping_city' => $address->city,
                'shipping_postal_code' => $address->postal_code,
                'shipping_country' => $address->country,
            ]);

            // 6. Lines with the price frozen at purchase (RG22).
            foreach ($orderLines as $orderLine) {
                $order->lines()->create($orderLine);
            }

            // 7. Hold the stock until the payment succeeds or the order expires (RG11).
            foreach ($orderLines as $orderLine) {
                $this->inventory->reserve($inventories->get($orderLine['product_id']), $orderLine['quantity'], $order);
            }

            // 8. The cart is converted last, once everything else worked (RG16).
            $cart->update(['status' => 'converted']);

            return $order->load(['lines.product', 'coupon']);
        });
    }

    /**
     * The cart is locked too: the same customer clicking twice cannot convert
     * the same cart into two orders, because the second request waits here and
     * then sees the status "converted".
     */
    private function activeCartWithLines(User $user): Cart
    {
        $cart = $user->carts()
            ->where('status', 'active')
            ->lockForUpdate()
            ->first();

        if (! $cart) {
            throw ValidationException::withMessages(['cart' => 'Your cart is empty.']);
        }

        $cart->load('lines.product');

        if ($cart->lines->isEmpty()) {
            throw ValidationException::withMessages(['cart' => 'Your cart is empty.']);
        }

        return $cart;
    }
}
