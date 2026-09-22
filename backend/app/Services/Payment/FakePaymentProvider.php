<?php

namespace App\Services\Payment;

use App\Models\Payment;
use App\Models\Refund;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

/**
 * A provider for development and tests. It invents references instead of
 * calling a real payment company, and logs what a real provider would do.
 *
 * To "pay" an order locally, send the webhook yourself:
 * see the webhook section of the README.
 */
class FakePaymentProvider implements PaymentProvider
{
    public function name(): string
    {
        return 'fake';
    }

    public function createPayment(Payment $payment): array
    {
        $ref = 'fake_pi_'.Str::lower(Str::random(24));

        Log::info('FakePaymentProvider: payment created', [
            'payment_id' => $payment->id,
            'amount' => $payment->amount,
            'provider_ref' => $ref,
        ]);

        return [
            'provider_ref' => $ref,
            'checkout_url' => config('app.url').'/fake-checkout/'.$ref,
        ];
    }

    public function cancelPayment(Payment $payment): void
    {
        Log::info('FakePaymentProvider: payment cancelled', [
            'payment_id' => $payment->id,
            'provider_ref' => $payment->provider_ref,
        ]);
    }

    public function refund(Refund $refund): string
    {
        $ref = 'fake_re_'.Str::lower(Str::random(24));

        Log::info('FakePaymentProvider: refund sent', [
            'refund_id' => $refund->id,
            'amount' => $refund->amount,
            'provider_ref' => $ref,
        ]);

        return $ref;
    }
}
