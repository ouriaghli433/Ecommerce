<?php

namespace App\Services\Payment;

use App\Models\Order;
use App\Models\Payment;
use App\Services\Inventory\InventoryService;
use App\Services\Refund\RefundService;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Throwable;

/**
 * Payment workflow: pending -> processing -> succeeded | failed.
 *
 * Two rules shape this class:
 * - The frontend never decides a payment succeeded (RG32). Only a verified
 *   provider event (a webhook) calls markSucceeded() / markFailed().
 * - Provider calls happen OUTSIDE database transactions, because a network
 *   call can take seconds and we must not hold row locks for that long.
 */
class PaymentService
{
    public function __construct(
        private PaymentProvider $provider,
        private InventoryService $inventory,
        private RefundService $refunds,
    ) {}

    /**
     * Start a payment for an order.
     *
     * @return array{payment: Payment, checkout_url: string}
     */
    public function start(Order $order): array
    {
        // Step 1 (inside a transaction): check the order and take the "active
        // payment" slot. The partial unique index on payments makes the
        // database refuse a second active payment even under a race (RG28).
        $payment = DB::transaction(function () use ($order) {
            $order = Order::whereKey($order->id)->lockForUpdate()->firstOrFail();

            // RG27: only a pending order that has not expired can be paid.
            if ($order->status !== 'pending_payment') {
                abort(409, "This order cannot be paid because it is {$order->status}.");
            }

            if (now()->greaterThanOrEqualTo($order->expires_at)) {
                abort(409, 'The payment time for this order has passed.');
            }

            if ($order->payments()->whereIn('status', ['pending', 'processing'])->exists()) {
                abort(409, 'A payment is already in progress for this order.');
            }

            return $order->payments()->create([
                'status' => 'pending',
                'amount' => $order->total_amount,
                'currency' => $order->currency,
                'provider' => $this->provider->name(),
            ]);
        });

        // Step 2 (outside the transaction): talk to the provider.
        try {
            $result = $this->provider->createPayment($payment);
        } catch (Throwable $e) {
            Log::error('Payment provider failed', ['payment_id' => $payment->id, 'error' => $e->getMessage()]);

            // Free the "active payment" slot so the customer can try again.
            $payment->update(['status' => 'failed', 'failure_reason' => 'provider_error']);

            abort(502, 'The payment provider is not answering. Please try again.');
        }

        // Step 3: store what the provider gave us.
        $payment->update([
            'provider_ref' => $result['provider_ref'],
            'status' => 'processing',
        ]);

        return ['payment' => $payment->fresh(), 'checkout_url' => $result['checkout_url']];
    }

    /**
     * The provider confirmed the money arrived. Called only from a verified
     * webhook event.
     *
     * Three cases:
     * 1. the payment already succeeded  -> do nothing (duplicate event)
     * 2. the order is still pending     -> order becomes paid, stock is sold
     * 3. the order is no longer pending -> late payment (RG30): the payment is
     *    still stored as succeeded, the order keeps its terminal status, and a
     *    LATE_PAYMENT refund is created.
     */
    public function markSucceeded(Payment $payment): void
    {
        $lateRefundNeeded = DB::transaction(function () use ($payment) {
            $payment = Payment::whereKey($payment->id)->lockForUpdate()->firstOrFail();

            if ($payment->status === 'succeeded') {
                return false; // duplicate event, nothing to do
            }

            if ($payment->status === 'failed') {
                // An event that contradicts a terminal state is ignored (RG37).
                Log::warning('Success event for a failed payment, ignored', ['payment_id' => $payment->id]);

                return false;
            }

            $order = Order::whereKey($payment->order_id)->lockForUpdate()->firstOrFail();

            $payment->update(['status' => 'succeeded', 'succeeded_at' => now()]);

            if ($order->status !== 'pending_payment') {
                return true; // late payment, refund after the commit
            }

            // The order is paid: the reservation becomes a real sale (RG11).
            $order->update(['status' => 'paid', 'paid_at' => now()]);
            $this->sellReservedStock($order);

            return false;
        });

        if ($lateRefundNeeded) {
            // Outside the transaction: this calls the provider (RG30).
            $this->refunds->create($payment->fresh(), $payment->amount, 'late_payment');
        }
    }

    /**
     * The provider says the payment failed. The order stays pending_payment,
     * so the customer can try again until it expires (RG33).
     */
    public function markFailed(Payment $payment, ?string $reason = null): void
    {
        DB::transaction(function () use ($payment, $reason) {
            $payment = Payment::whereKey($payment->id)->lockForUpdate()->firstOrFail();

            if (in_array($payment->status, ['succeeded', 'failed'])) {
                return; // terminal already (RG37)
            }

            $payment->update([
                'status' => 'failed',
                'failure_reason' => $reason ?? 'declined',
            ]);
        });
    }

    /**
     * Turn every reservation of the order into a sale.
     * Runs inside the caller's transaction, and locks the inventory rows in
     * product id order like checkout does, to avoid deadlocks.
     */
    private function sellReservedStock(Order $order): void
    {
        $order->load('lines');

        $inventories = $this->inventory->lockInventories($order->lines->pluck('product_id')->all());

        foreach ($order->lines as $line) {
            $inventory = $inventories->get($line->product_id);

            if ($inventory) {
                $this->inventory->sell($inventory, $line->quantity, $order);
            }
        }
    }

    /**
     * Used by the expiration job: ask the provider to close payments that are
     * still open. Never called inside a transaction (RG29).
     */
    public function cancelOpenProviderPayments(Order $order): void
    {
        $payments = $order->payments()
            ->whereIn('status', ['pending', 'processing'])
            ->whereNotNull('provider_ref')
            ->get();

        foreach ($payments as $payment) {
            try {
                $this->provider->cancelPayment($payment);
                $this->markFailed($payment, 'order_expired');
            } catch (Throwable $e) {
                Log::error('Could not cancel the provider payment', [
                    'payment_id' => $payment->id,
                    'error' => $e->getMessage(),
                ]);
            }
        }
    }

    /** Small helper so other services can validate a webhook's payment. */
    public function findByProviderRef(string $providerRef): ?Payment
    {
        return Payment::where('provider_ref', $providerRef)->first();
    }

    public function providerName(): string
    {
        return $this->provider->name();
    }
}
