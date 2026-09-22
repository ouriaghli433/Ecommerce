<?php

namespace App\Services\Order;

use App\Jobs\SendOrderNotificationJob;
use App\Models\Order;
use App\Models\User;
use App\Services\Inventory\InventoryService;
use App\Services\Payment\PaymentService;
use App\Services\Refund\RefundService;
use Illuminate\Support\Facades\DB;

/**
 * Things that happen to an order after checkout: cancelling it, and later
 * expiring it. Both need the same careful steps:
 *
 *   lock the order -> check its status again -> change it -> release stock
 *   -> (after the commit) talk to the payment provider.
 */
class OrderService
{
    public function __construct(
        private InventoryService $inventory,
        private PaymentService $payments,
        private RefundService $refunds,
    ) {}

    /**
     * Cancel an order (RG25). The policy has already said this user may do it;
     * here we check the status again under a lock, because it could have
     * changed between the policy check and now (for example a webhook paying
     * the order at the same moment).
     */
    public function cancel(Order $order, ?User $actor = null, ?string $reason = null): Order
    {
        $result = DB::transaction(function () use ($order, $reason) {
            $order = Order::whereKey($order->id)->lockForUpdate()->firstOrFail();

            if (! in_array($order->status, ['pending_payment', 'paid', 'processing'])) {
                abort(409, "An order that is {$order->status} cannot be cancelled.");
            }

            $wasWaitingForPayment = $order->status === 'pending_payment';

            $order->update([
                'status' => 'cancelled',
                'cancelled_at' => now(),
                'cancel_reason' => $reason,
            ]);

            // Stock was only reserved while waiting for payment; once paid it
            // was sold, so there is nothing to release (RG12).
            if ($wasWaitingForPayment) {
                $this->releaseReservedStock($order);
            }

            // A paid order has money to give back (RG25).
            $succeededPayment = $order->payments()->where('status', 'succeeded')->first();

            return [
                'order' => $order,
                'was_waiting_for_payment' => $wasWaitingForPayment,
                'payment_to_refund' => $succeededPayment,
            ];
        });

        // Outside the transaction: provider calls.
        if ($result['was_waiting_for_payment']) {
            $this->payments->cancelOpenProviderPayments($result['order']);
        }

        if ($result['payment_to_refund']) {
            $this->refunds->create(
                $result['payment_to_refund'],
                $result['payment_to_refund']->amount,
                'order_cancelled',
                $actor,
            );
        }

        SendOrderNotificationJob::dispatch($order->id, 'order_cancelled');

        return $result['order']->fresh(['lines.product', 'coupon']);
    }

    /**
     * Expire one order that was not paid in time (RG29).
     *
     * Called by ExpireOrderJob. The steps are in this exact order on purpose:
     *
     * 1. lock the order row, so nothing else can change it meanwhile;
     * 2. read its status AGAIN: between the moment the job was queued and now,
     *    a webhook may have paid it, or the customer may have cancelled it;
     * 3. skip orders that have a payment in "processing": the money may be on
     *    its way, and the late payment rule (RG30) will deal with the rest;
     * 4. mark it expired and release the reserved stock;
     * 5. AFTER the commit, ask the provider to close any open payment.
     *
     * Returns true when the order was really expired by this call.
     */
    public function expire(Order $order): bool
    {
        $expired = DB::transaction(function () use ($order) {
            $order = Order::whereKey($order->id)->lockForUpdate()->firstOrFail();

            if ($order->status !== 'pending_payment') {
                return false; // already paid, cancelled or expired
            }

            if ($order->expires_at->isFuture()) {
                return false; // still has time
            }

            if ($order->payments()->where('status', 'processing')->exists()) {
                return false; // a payment is in flight, leave it alone
            }

            $order->update(['status' => 'expired']);

            $this->releaseReservedStock($order, 'Order expired');

            return true;
        });

        if ($expired) {
            $this->payments->cancelOpenProviderPayments($order->fresh());

            SendOrderNotificationJob::dispatch($order->id, 'order_expired');
        }

        return $expired;
    }

    /**
     * Give back the stock held by this order. Inventory rows are locked in
     * product id order, the same order checkout uses, to avoid deadlocks.
     */
    private function releaseReservedStock(Order $order, string $reason = 'Order cancelled'): void
    {
        $order->load('lines');

        $inventories = $this->inventory->lockInventories($order->lines->pluck('product_id')->all());

        foreach ($order->lines as $line) {
            $inventory = $inventories->get($line->product_id);

            if ($inventory) {
                $this->inventory->release($inventory, $line->quantity, $order, $reason);
            }
        }
    }
}
