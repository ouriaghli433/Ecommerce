
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
    public function create(Payment $payment, User $admin, string $reason): Refund
    {
        // Check payment status
        if ($payment->status !== 'succeeded') {
            throw ValidationException::withMessages([
                'payment' => 'Only successful payments can be refunded.',
            ]);
        }

        if ($payment->provider !== 'stripe') {
            throw ValidationException::withMessages([
                'payment' => 'This payment provider is not supported.',
            ]);
        }

        // Check if a refund already exists
        if (Refund::where('payment_id', $payment->id)->exists()) {
            throw ValidationException::withMessages([
                'payment' => 'This payment has already been refunded or has a refund request.',
            ]);
        }

        // Create refund in database
        $refund = Refund::create([
            'payment_id' => $payment->id,
            'created_by' => $admin->id,
            'amount' => $payment->amount,
            'status' => 'pending',
            'reason' => $reason,
        ]);

        try {
            Stripe::setApiKey(config('services.stripe.secret'));

            // Get Stripe Checkout Session
            $session = Session::retrieve($payment->provider_ref);

            // Get PaymentIntent ID
            $paymentIntent = $session->payment_intent;

            if (is_object($paymentIntent)) {
                $paymentIntent = $paymentIntent->id;
            }

            if (!$paymentIntent) {
                throw new \Exception('Stripe PaymentIntent was not found.');
            }

            // Request full refund from Stripe
            $stripeRefund = StripeRefund::create([
                'payment_intent' => $paymentIntent,
                'amount' => $refund->amount,
                'metadata' => [
                    'local_refund_id' => $refund->id,
                ],
            ], [
                'idempotency_key' => 'refund_' . $refund->id,
            ]);

            // Update refund status
            $refund->provider_ref = $stripeRefund->id;

            if ($stripeRefund->status === 'succeeded') {
                $refund->status = 'succeeded';
            } elseif (
                $stripeRefund->status === 'failed' ||
                $stripeRefund->status === 'canceled'
            ) {
                $refund->status = 'failed';
            }

            $refund->save();

        } catch (\Throwable $e) {
            // Keep refund pending if Stripe response is uncertain
            Log::error('Refund error: ' . $e->getMessage(), [
                'refund_id' => $refund->id,
            ]);

            throw $e;
        }

        return $refund;
    }
}
