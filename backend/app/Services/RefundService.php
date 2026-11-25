<?php

namespace App\Services;

use App\Models\Payment;
use App\Models\Refund;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\ValidationException;
use Stripe\Checkout\Session;
use Stripe\Refund as StripeRefund;
use Stripe\Stripe;

class RefundService
{
    public function create(
        Payment $payment,
        ?User $admin,
        string $reason
    ): Refund {
        
        [$payment, $refund] = DB::transaction(function () use (
            $payment,
            $admin,
            $reason
        ) {
            $lockedPayment = Payment::whereKey($payment->id)
                ->lockForUpdate()
                ->firstOrFail();

            if ($lockedPayment->status !== 'succeeded') {
                throw ValidationException::withMessages([
                    'payment' => 'Only successful payments can be refunded.',
                ]);
            }

            if ($lockedPayment->provider !== 'stripe') {
                throw ValidationException::withMessages([
                    'payment' => 'This payment provider is not supported.',
                ]);
            }

            $existingRefund = Refund::where(
                'payment_id',
                $lockedPayment->id
            )->first();

            if ($existingRefund) {
                if ($existingRefund->status === 'succeeded') {
                    return [$lockedPayment, $existingRefund];
                }

                if ($existingRefund->status === 'failed') {
                    throw ValidationException::withMessages([
                        'payment' => 'This refund has failed and requires manual review.',
                    ]);
                }

                return [$lockedPayment, $existingRefund];
            }

            $newRefund = Refund::create([
                'payment_id' => $lockedPayment->id,
                'created_by' => $admin?->id,
                'amount' => $lockedPayment->amount,
                'status' => 'pending',
                'reason' => $reason,
            ]);

            return [$lockedPayment, $newRefund];
        });

        if ($refund->status === 'succeeded') {
            return $refund;
        }

        try {
            Stripe::setApiKey(config('services.stripe.secret'));


            if ($refund->provider_ref) {
                $stripeRefund = StripeRefund::retrieve(
                    $refund->provider_ref
                );
            } else {
                $session = Session::retrieve(
                    $payment->provider_ref
                );

                $paymentIntent = $session->payment_intent;

                if (is_object($paymentIntent)) {
                    $paymentIntent = $paymentIntent->id;
                }

                if (! $paymentIntent) {
                    throw new \RuntimeException(
                        'Stripe PaymentIntent was not found.'
                    );
                }

                $stripeRefund = StripeRefund::create([
                    'payment_intent' => $paymentIntent,
                    'amount' => $refund->amount,
                    'metadata' => [
                        'local_refund_id' => $refund->id,
                    ],
                ], [
                    'idempotency_key' => 'refund_' . $refund->id,
                ]);
            }

            // Synchronize the local Refund with Stripe.
            $refund->provider_ref = $stripeRefund->id;

            if ($stripeRefund->status === 'succeeded') {
                $refund->status = 'succeeded';
            } elseif (
                in_array($stripeRefund->status, ['failed', 'canceled'], true)
            ) {
                $refund->status = 'failed';
            } else {
                $refund->status = 'pending';
            }

            $refund->save();

        } catch (\Throwable $e) {
            // Keep the local Refund pending if Stripe's result is uncertain.
            Log::error('Refund error: ' . $e->getMessage(), [
                'refund_id' => $refund->id,
                'payment_id' => $payment->id,
            ]);

            throw $e;
        }

        return $refund;
    }
}
