<?php

namespace App\Services\Payment;

use App\Models\Payment;
use App\Models\Refund;

/**
 * What any payment provider (Stripe, CMI, a fake one...) must be able to do.
 *
 * The application only knows this interface, so swapping providers means
 * writing one new class and changing PAYMENT_PROVIDER in .env.
 *
 * None of these methods change our database: they only talk to the provider.
 * The real status always comes back later through a webhook (RG32).
 */
interface PaymentProvider
{
    /** Name stored on the payment row, e.g. "fake". */
    public function name(): string;

    /**
     * Ask the provider to start a payment.
     * Returns the provider reference plus whatever the frontend needs
     * to continue (a redirect URL, a client secret...).
     *
     * @return array{provider_ref: string, checkout_url: string}
     */
    public function createPayment(Payment $payment): array;

    /** Cancel a payment that is still open on the provider side. */
    public function cancelPayment(Payment $payment): void;

    /** Ask the provider to send money back. Returns the provider refund id. */
    public function refund(Refund $refund): string;
}
