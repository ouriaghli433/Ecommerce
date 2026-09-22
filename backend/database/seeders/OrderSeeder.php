<?php

namespace Database\Seeders;

use App\Models\Cart;
use App\Models\Inventory;
use App\Models\Order;
use App\Models\Payment;
use App\Models\Product;
use App\Models\User;
use App\Services\Checkout\CheckoutService;
use App\Services\Order\OrderService;
use App\Services\Payment\PaymentService;
use Illuminate\Database\Seeder;
use Illuminate\Support\Carbon;
use Throwable;

/**
 * Orders in every state, created through the REAL services.
 *
 * Why not insert order rows directly? Because checkout, payment, cancel and
 * expire are what keep stock, movements, coupons and refunds consistent.
 * Going through them means the demo data obeys the same rules as the shop,
 * so the numbers in the admin always add up.
 */
class OrderSeeder extends Seeder
{
    public function __construct(
        private CheckoutService $checkout,
        private PaymentService $payments,
        private OrderService $orders,
    ) {}

    public function run(): void
    {
        // Notifications are queued jobs. Running them inline here means the
        // demo accounts already have notifications, without a worker.
        config(['queue.default' => 'sync']);

        $customers = User::where('role', 'customer')->has('addresses')->get();

        if ($customers->isEmpty()) {
            $this->command->warn('No customer with an address: skipping orders.');

            return;
        }

        // The mix is fixed, not random, so the demo always contains every
        // situation: something to pay, a refused payment, a cancellation, an
        // expired order, a late payment with its refund, and paid orders at
        // each step of the delivery.
        $paths = [
            ...array_fill(0, 6, 'pending'),
            ...array_fill(0, 3, 'payment_failed'),
            ...array_fill(0, 3, 'cancelled_before_paying'),
            ...array_fill(0, 3, 'expired'),
            ...array_fill(0, 2, 'late_payment'),
            ...array_fill(0, 3, 'paid'),
            ...array_fill(0, 2, 'refunded_after_paying'),
            ...array_fill(0, 3, 'processing'),
            ...array_fill(0, 3, 'shipped'),
            ...array_fill(0, 6, 'delivered'),
        ];

        shuffle($paths);

        $created = 0;

        foreach ($paths as $path) {
            $customer = $customers->random();

            try {
                $order = $this->placeOrder($customer);
            } catch (Throwable $e) {
                // Not enough stock left for this pick: just try the next one.
                continue;
            }

            if (! $order) {
                continue;
            }

            $this->giveItAHistory($order, $customer, $path);
            $created++;
        }

        $this->command->info("Orders: {$created} created");
        $this->command->info('  '.$this->countByStatus());
    }

    /**
     * Fill the customer's cart with one to three products that are really in
     * stock, then check out like the shop would.
     */
    private function placeOrder(User $customer): ?Order
    {
        $cart = Cart::firstOrCreate(['user_id' => $customer->id, 'status' => 'active']);
        $cart->lines()->delete();

        $products = Product::where('is_active', true)
            ->inRandomOrder()
            ->take(random_int(1, 3))
            ->get();

        $addedSomething = false;

        foreach ($products as $product) {
            $inventory = Inventory::where('product_id', $product->id)->first();
            $available = $inventory ? $inventory->on_hand - $inventory->reserved : 0;

            if ($available < 1) {
                continue;
            }

            $cart->lines()->create([
                'product_id' => $product->id,
                'quantity' => min($available, random_int(1, 2)),
                'unit_price' => $product->price,
            ]);

            $addedSomething = true;
        }

        if (! $addedSomething) {
            return null;
        }

        $address = $customer->addresses()->orderByDesc('is_default')->first();

        // One order in four uses a coupon that is currently valid.
        $coupon = random_int(1, 4) === 1 ? 'SAVE50' : null;

        return $this->checkout->checkout($customer, $address, $coupon);
    }

    /**
     * Push the order along the path it was given, and place it in the past so
     * the lists look like a shop that has been running for a while.
     */
    private function giveItAHistory(Order $order, User $customer, string $path): void
    {
        $placedAt = Carbon::now()->subDays(random_int(0, 60))->subHours(random_int(0, 23));

        $order->forceFill(['created_at' => $placedAt, 'updated_at' => $placedAt])->save();

        // Still waiting for payment: the stock stays reserved.
        if ($path === 'pending') {
            return;
        }

        // The customer tried and the card was refused (RG33): the order stays
        // pending, so they can try again.
        if ($path === 'payment_failed') {
            $payment = $this->startPayment($order);

            if ($payment) {
                $this->payments->markFailed($payment, 'declined');
            }

            return;
        }

        // Cancelled before paying: the reserved stock goes back on sale.
        if ($path === 'cancelled_before_paying') {
            $this->orders->cancel($order, $customer, 'Changed my mind');

            return;
        }

        // Never paid in time: the expiration job took it.
        if ($path === 'expired') {
            $this->expireNow($order, $placedAt);

            return;
        }

        // The money arrived after the order had expired (RG30): the order
        // stays expired and a LATE_PAYMENT refund is created automatically.
        //
        // The order is expired FIRST, then the payment row is inserted by
        // hand: the API would refuse to start a payment on an expired order,
        // and the expiration job skips orders whose payment is still
        // processing. What we recreate here is a payment that was already in
        // flight at the provider when the deadline passed.
        if ($path === 'late_payment') {
            $this->expireNow($order, $placedAt);

            $payment = Payment::create([
                'order_id' => $order->id,
                'status' => 'processing',
                'amount' => $order->total_amount,
                'currency' => $order->currency,
                'provider' => 'fake',
                'provider_ref' => 'fake_pi_'.str()->lower(str()->random(24)),
            ]);

            $this->payments->markSucceeded($payment);

            return;
        }

        // Everything below is paid first.
        $payment = $this->startPayment($order);

        if (! $payment) {
            return;
        }

        $this->payments->markSucceeded($payment);

        $paidAt = $placedAt->copy()->addMinutes(random_int(2, 30));
        $order->fresh()->forceFill(['paid_at' => $paidAt])->save();

        // Cancelled after paying: the money is sent back (RG25).
        if ($path === 'refunded_after_paying') {
            $this->orders->cancel($order->fresh(), $customer, 'Out of stock at the warehouse');

            return;
        }

        // The shop prepares, ships and delivers, following the allowed
        // transitions (RG23).
        $steps = match ($path) {
            'processing' => ['processing'],
            'shipped' => ['processing', 'shipped'],
            'delivered' => ['processing', 'shipped', 'delivered'],
            default => [], // "paid": waiting to be prepared
        };

        foreach ($steps as $status) {
            $order->fresh()->update(['status' => $status]);
        }
    }

    /** Make the deadline pass, then run the same code as the expiration job. */
    private function expireNow(Order $order, Carbon $placedAt): void
    {
        $order->forceFill(['expires_at' => $placedAt->copy()->addMinutes(20)])->save();

        $this->orders->expire($order->fresh());
    }

    private function startPayment(Order $order): ?Payment
    {
        try {
            return $this->payments->start($order->fresh())['payment'];
        } catch (Throwable $e) {
            return null;
        }
    }

    private function countByStatus(): string
    {
        return Order::selectRaw('status, count(*) as total')
            ->groupBy('status')
            ->pluck('total', 'status')
            ->map(fn ($total, $status) => "{$status}: {$total}")
            ->implode(' · ');
    }
}
