<?php

namespace App\Services\Refund;

use App\Models\Payment;
use App\Models\Refund;
use App\Models\User;
use App\Services\Payment\PaymentProvider;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\ValidationException;
use Throwable;

/**
 * Refunds (RG34, RG35).
 *
 * - A refund always targets one SUCCEEDED payment.
 * - The refunds of a payment, minus the failed ones, can never be more than
 *   the payment amount. The payment row is locked while we check that, so two
 *   refunds asked at the same time cannot both pass the check.
 * - The progress lives on the refund row only; the order has no refund status.
 */
class RefundService
{
    public function __construct(private PaymentProvider $provider) {}

    /**
     * Create the refund, then ask the provider for the money back.
     * The provider call is outside the transaction on purpose.
     */
    public function create(Payment $payment, int $amount, string $reason, ?User $author = null): Refund
    {
        $refund = DB::transaction(function () use ($payment, $amount, $reason, $author) {
            $payment = Payment::whereKey($payment->id)->lockForUpdate()->firstOrFail();

            if ($payment->status !== 'succeeded') {
                throw ValidationException::withMessages([
                    'payment' => 'Only a succeeded payment can be refunded.',
                ]);
            }

            // Failed refunds gave no money back, so they do not count.
            $alreadyRefunded = (int) $payment->refunds()
                ->where('status', '!=', 'failed')
                ->sum('amount');

            $left = $payment->amount - $alreadyRefunded;

            if ($amount > $left) {
                throw ValidationException::withMessages([
                    'amount' => "This payment can only be refunded up to {$left} centimes.",
                ]);
            }

            return $payment->refunds()->create([
                'amount' => $amount,
                'status' => 'pending',
                'reason' => $reason,
                'created_by' => $author?->id,
            ]);
        });

        return $this->sendToProvider($refund);
    }

    /**
     * Ask the provider to move the money, then store the result.
     * A failed refund stays in the table with status "failed", so the amount
     * it holds is freed for another try.
     */
    private function sendToProvider(Refund $refund): Refund
    {
        try {
            $providerRef = $this->provider->refund($refund);
        } catch (Throwable $e) {
            Log::error('Refund provider call failed', ['refund_id' => $refund->id, 'error' => $e->getMessage()]);

            $refund->update(['status' => 'failed']);

            return $refund->fresh();
        }

        $refund->update(['status' => 'succeeded', 'provider_ref' => $providerRef]);

        return $refund->fresh();
    }

    /**
     * Called from a verified webhook when the provider confirms or rejects a
     * refund it processed on its side.
     */
    public function markStatusFromProvider(Refund $refund, string $status): void
    {
        DB::transaction(function () use ($refund, $status) {
            $refund = Refund::whereKey($refund->id)->lockForUpdate()->firstOrFail();

            // succeeded and failed are terminal: a repeated event changes nothing.
            if (in_array($refund->status, ['succeeded', 'failed'])) {
                return;
            }

            $refund->update(['status' => $status]);
        });
    }
}
