<?php

namespace App\Console\Commands;

use App\Models\Inventory;
use App\Models\Order;
use App\Models\Payment;
use App\Services\InventoryService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Stripe\Checkout\Session;
use Stripe\Stripe;

class VerifyExpiredOrders extends Command
{
    protected $signature = 'orders:verify-expired';

    protected $description = 'Verify expired orders with Stripe before releasing reserved inventory';

    public function handle(InventoryService $inventoryService): int
    {
        Stripe::setApiKey(config('services.stripe.secret'));

        Order::where('status', 'pending_payment')
            ->where('expires_at', '<=', now())
            ->chunkById(100, function ($orders) use ($inventoryService) {
                foreach ($orders as $order) {
                    $this->verifyOrder($order, $inventoryService);
                }
            });

        return self::SUCCESS;
    }

    private function verifyOrder(
        Order $order,
        InventoryService $inventoryService
    ): void {
        $payments = Payment::where('order_id', $order->id)
            ->where('provider', 'stripe')
            ->orderBy('id')
            ->get();

        $paidPaymentId = null;
        $paidPaymentAlreadyRecorded = false;
        $allSessionsExpired = true;

        foreach ($payments as $payment) {
            // A locally successful payment must never be expired.
            if ($payment->status === 'succeeded') {
                $paidPaymentId = $payment->id;
                $paidPaymentAlreadyRecorded = true;
                break;
            }

            // No Stripe Session reference means the result is uncertain.
            if (! $payment->provider_ref) {
                if (in_array($payment->status, ['pending', 'processing'], true)) {
                    $allSessionsExpired = false;
                }

                continue;
            }

            try {
                $session = Session::retrieve($payment->provider_ref);
            } catch (\Throwable $e) {
                Log::warning('Unable to verify Stripe Checkout Session.', [
                    'order_id' => $order->id,
                    'payment_id' => $payment->id,
                    'error' => $e->getMessage(),
                ]);

                $allSessionsExpired = false;
                continue;
            }

            // Stripe confirms that the payment succeeded.
            if ($session->payment_status === 'paid') {
                if (
                    $session->amount_total !== $payment->amount ||
                    strtolower($session->currency) !==
                    strtolower($payment->currency)
                ) {
                    Log::error('Stripe payment amount or currency mismatch.', [
                        'order_id' => $order->id,
                        'payment_id' => $payment->id,
                    ]);

                    $allSessionsExpired = false;
                    continue;
                }

                $paidPaymentId = $payment->id;
                break;
            }

            // Only an expired and unpaid Session is terminal.
            if ($session->status !== 'expired') {
                $allSessionsExpired = false;
            }
        }

        // Finalize the order using database locks.
        try {
            DB::transaction(function () use (
                $order,
                $payments,
                $paidPaymentId,
                $paidPaymentAlreadyRecorded,
                $allSessionsExpired,
                $inventoryService
            ) {
                // Lock payments first, matching the webhook lock order.
                $lockedPayments = Payment::where('order_id', $order->id)
                    ->orderBy('id')
                    ->lockForUpdate()
                    ->get();

                $lockedOrder = Order::whereKey($order->id)
                    ->lockForUpdate()
                    ->first();

                if (
                    ! $lockedOrder ||
                    $lockedOrder->status !== 'pending_payment'
                ) {
                    return;
                }

                // A webhook may have succeeded while Stripe was being checked.
                $successfulPayment = $lockedPayments->firstWhere(
                    'status',
                    'succeeded'
                );

                if ($successfulPayment) {
                    $lockedOrder->update([
                        'status' => 'paid',
                        'paid_at' => $lockedOrder->paid_at ?? now(),
                    ]);

                    return;
                }

                // Stripe confirmed a successful payment.
                if ($paidPaymentId !== null) {
                    $payment = $lockedPayments->firstWhere(
                        'id',
                        $paidPaymentId
                    );

                    if (! $payment) {
                        throw new \RuntimeException(
                            'Verified Stripe payment was not found locally.'
                        );
                    }

                    // If the webhook did not process it, convert reservations to sales.
                    if (! $paidPaymentAlreadyRecorded) {
                        foreach ($lockedOrder->orderLines as $orderLine) {
                            $inventory = Inventory::where(
                                'product_id',
                                $orderLine->product_id
                            )
                                ->lockForUpdate()
                                ->first();

                            if (! $inventory) {
                                throw new \RuntimeException(
                                    "No inventory found for product {$orderLine->product_id}."
                                );
                            }

                            $inventoryService->recordMovement(
                                inventory: $inventory,
                                type: 'sale',
                                quantity: $orderLine->quantity,
                                reason: 'Paid order verified by scheduler',
                                referenceType: 'order',
                                referenceId: $lockedOrder->id,
                            );
                        }

                        $payment->update([
                            'status' => 'succeeded',
                            'succeeded_at' => now(),
                        ]);
                    }

                    $lockedOrder->update([
                        'status' => 'paid',
                        'paid_at' => now(),
                    ]);

                    return;
                }

                // Do not release stock while any Session is still uncertain.
                if (! $allSessionsExpired) {
                    return;
                }

                // All payment attempts are confirmed expired/unpaid.
                foreach ($lockedOrder->orderLines as $orderLine) {
                    $inventory = Inventory::where(
                        'product_id',
                        $orderLine->product_id
                    )
                        ->lockForUpdate()
                        ->first();

                    if (! $inventory) {
                        throw new \RuntimeException(
                            "No inventory found for product {$orderLine->product_id}."
                        );
                    }

                    $inventoryService->recordMovement(
                        inventory: $inventory,
                        type: 'release',
                        quantity: $orderLine->quantity,
                        reason: 'Expired order reservation released',
                        referenceType: 'order',
                        referenceId: $lockedOrder->id,
                    );
                }

                $lockedOrder->update([
                    'status' => 'expired',
                ]);
            });

        } catch (\Throwable $e) {
            Log::error('Expired order verification failed.', [
                'order_id' => $order->id,
                'error' => $e->getMessage(),
            ]);
        }
    }
}
