<?php

namespace App\Http\Controllers\Checkout;

use App\Http\Controllers\Controller;
use App\Models\Inventory;
use App\Models\Order;
use App\Models\ShippingPrice;
use App\Services\InventoryService;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use App\Services\CheckoutService;
use Illuminate\Http\Request;
use App\Services\CouponService;


class CheckoutController extends Controller
{
    public function preview(
        Request $request,
        CheckoutService $checkoutService,
        CouponService $couponService
        ){
        $user =  $request->user();

        // get cart and cart lines
        $activeCart = $checkoutService->getActiveCart($user);

        if (!$activeCart || $activeCart->cartLines->isEmpty()) {
            return response()->json([
                'message' => 'Your cart is empty.',
            ], 422);
        }

        // get user addresses
        $addresses = $user->addresses;

        // calculate total price
        $subTotal = $checkoutService->calculateSubtotal(
            $activeCart->cartLines
        );

        // Resolve selected/default address
        $address = $checkoutService->resolveAddress(
            $user,
            $request->input('address_id')
        );

        // Calculate shipping
        $shippingPrice = $checkoutService->calculateShipping($address);

        if ($address && !$shippingPrice) {
            throw ValidationException::withMessages([
                'address_id' => [
                    'Shipping is not available for this city.',
                ],
            ]);
        }

        $shippingCost = 0;

        if ($shippingPrice) {
            $shippingCost = $shippingPrice->cost;
        }

        $couponCode = $request->input('coupon_code');

        $discount = 0;

        if ($couponCode) {
            $couponResult = $couponService->applyCoupon(
                $couponCode,
                $user,
                $subTotal,
                $shippingCost
            );

            $discount = $couponResult['discount'];
        }

        // Calculate final totals
        $totals = $checkoutService->calculateTotals(
            $subTotal,
            $shippingCost,
            $discount
        );

        // Return checkout preview
        return response()->json([
            'addresses' => $addresses,
            'selected_address' => $address,
            'cart' => $activeCart,
            'cart_lines' => $activeCart->cartLines,
            'subtotal' => $totals['sub_total'],
            'shipping_cost' => $totals['shipping_cost'],
            'discount' => $totals['discount'],
            'total' => $totals['total'],
        ]);
    }
    public function placeOrder(
        Request $request,
        InventoryService $inventoryService,
        CheckoutService $checkoutService,
        CouponService $couponService
    ){
        $user =  $request->user();

        return  DB::transaction(function () use  ($request,$user,$checkoutService,$couponService,$inventoryService){


            
            // get cart and cart lines
            $activeCart = $checkoutService->getActiveCart($user);
            if (!$activeCart || $activeCart->cartLines->isEmpty()) {
                throw ValidationException::withMessages([
                    'cart' => ['Your cart is empty.'],
                ]);
            }

            $productIds = $activeCart->cartLines
                ->pluck('product_id') // get only product ID
                ->unique()
                ->values();  // reOrder indexes 
            $inventories = Inventory::whereIn('product_id', $productIds)
                ->lockForUpdate()
                ->get();
            // calculate total price
            $subTotal = $checkoutService->calculateSubtotal(
                $activeCart->cartLines
            );

            // Resolve selected/default address
            $address = $checkoutService->resolveAddress(
                $user,
                $request->input('address_id')
            );

            // Calculate shipping
            $shippingPrice = $checkoutService->calculateShipping($address);

            if ($address && !$shippingPrice) {
                throw ValidationException::withMessages([
                    'address_id' => [
                        'Shipping is not available for this city.',
                    ],
                ]);
            }

            if (!$address) {
                throw ValidationException::withMessages([
                    'address_id' => ['Please select a shipping address.'],
                ]);
            }

            $shippingCost = 0;

            if ($shippingPrice) {
                $shippingCost = $shippingPrice->cost;
            }

            $couponCode = $request->input('coupon_code');
            $couponResult = null;
            $discount = 0;

            if ($couponCode) {
                $couponResult = $couponService->applyCoupon(
                    $couponCode,
                    $user,
                    $subTotal,
                    $shippingCost
                );

                $discount = $couponResult['discount'];
                $couponId = $couponResult['couponId'];
            }

            // Calculate final totals
            $totals = $checkoutService->calculateTotals(
                $subTotal,
                $shippingCost,
                $discount
            );

            $order = Order::create([
                'user_id' => $user->id,
                'coupon_id' => $couponId ?? null,
                'shipping_address_id' => $address->id,

                'status' => 'pending_payment',

                'subtotal' => $totals['sub_total'],
                'discount_amount' => $totals['discount'],
                'shipping_amount' => $totals['shipping_cost'],
                'tax_amount' => 0,
                'total_amount' => $totals['total'],

                'expires_at' => now()->addMinutes(30),

                'shipping_full_name' => $address->full_name,
                'shipping_phone' => $address->phone,
                'shipping_address_line' => $address->address_line,
                'shipping_city' => $address->city,
                'shipping_postal_code' => $address->postal_code,
                'shipping_country' => $address->country,
            ]);

            foreach ($activeCart->cartLines as $cartLine) {
                $order->orderLines()->create([
                    'product_id' => $cartLine->product_id,
                    'quantity' => $cartLine->quantity,
                    'unit_price' => $cartLine->unit_price,
                ]);
            }

            foreach ($activeCart->cartLines as $cartLine) {
                $inventory = $inventories->firstWhere(
                    'product_id',
                    $cartLine->product_id
                );

                if (!$inventory) {
                    throw ValidationException::withMessages([
                        'inventory' => [
                            "Inventory not found for product {$cartLine->product_id}.",
                        ],
                    ]);
                }

                $inventoryService->recordMovement(
                    $inventory,
                    'reservation',
                    $cartLine->quantity,
                    reason: 'Order reservation',
                    referenceType: 'order',
                    referenceId: $order->id,
                    createdBy: $user->id
                );
            }

            // Clear cart after successful reservation
            $activeCart->cartLines()->delete();

            $activeCart->update([
                'status' => 'converted',
            ]);

            return response()->json([
                'message' => 'Order created successfully.',
                'order' => $order->load('orderLines'),
            ], 201);

        });
    }
}
