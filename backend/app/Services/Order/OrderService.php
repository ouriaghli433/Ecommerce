<?php

namespace App\Services\Order;

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

        return $result['order']->fresh(['lines.product', 'coupon']);
    }

    /**
     * Give back the stock held by this order. Inventory rows are locked in
     * product id order, the same order checkout uses, to avoid deadlocks.
     */
    private function releaseReservedStock(Order $order): void
    {
        $order->load('lines');

        $inventories = $this->inventory->lockInventories($order->lines->pluck('product_id')->all());

        foreach ($order->lines as $line) {
            $inventory = $inventories->get($line->product_id);

            if ($inventory) {
                $this->inventory->release($inventory, $line->quantity, $order, 'Order cancelled');
            }
        }
    }
}
