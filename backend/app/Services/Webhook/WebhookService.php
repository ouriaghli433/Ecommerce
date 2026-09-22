<?php

namespace App\Services\Webhook;

use App\Models\Payment;
use App\Models\Refund;
use App\Models\WebhookEvent;
use App\Services\Payment\PaymentService;
use App\Services\Refund\RefundService;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

/**
 * Turns a verified provider event into a change in our database (RG37).
 *
 * Providers retry their webhooks, so the SAME event can arrive several times,
 * sometimes at the same second. Two things make that safe:
 *
 * 1. provider_event_id is unique in webhook_events. The second insert fails,
 *    and we answer "already received" without doing the work twice.
 * 2. PaymentService / RefundService check the status again under a row lock,
 *    so even a race ends with one single change.
 */
class WebhookService
{
    public function __construct(
        private PaymentService $payments,
        private RefundService $refunds,
    ) {}

    /**
     * @param  array{id: string, type: string, data: array<string, mixed>}  $payload
     * @return array{status: string}
     */
    public function handle(string $provider, array $payload): array
    {
        // Step 1: remember the event. The unique index on provider_event_id is
        // the guard against duplicates.
        //
        // insertOrIgnore writes "ON CONFLICT DO NOTHING" in Postgres: when the
        // row is already there the insert changes nothing and returns 0 rows.
        // We use it instead of catching the unique error because in Postgres a
        // failed statement cancels the whole transaction around it.
        $inserted = WebhookEvent::insertOrIgnore([
            'id' => (string) Str::uuid(),
            'provider' => $provider,
            'provider_event_id' => $payload['id'],
            'event_type' => $payload['type'],
            'payload' => json_encode($payload),
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        if ($inserted === 0) {
            Log::info('Duplicate webhook ignored', ['provider_event_id' => $payload['id']]);

            return ['status' => 'already_received'];
        }

        $event = WebhookEvent::where('provider_event_id', $payload['id'])->firstOrFail();

        // Step 2: do the work.
        $result = $this->process($payload);

        $event->update(['processed_at' => now()]);

        return ['status' => $result];
    }

    /**
     * Only the events we understand change something. Anything else is stored
     * and ignored, so the provider does not keep retrying it.
     */
    private function process(array $payload): string
    {
        $providerRef = $payload['data']['provider_ref'] ?? null;

        return match ($payload['type']) {
            'payment.succeeded' => $this->paymentSucceeded($providerRef),
            'payment.failed' => $this->paymentFailed($providerRef, $payload['data']['failure_reason'] ?? null),
            'refund.succeeded' => $this->refundStatus($providerRef, 'succeeded'),
            'refund.failed' => $this->refundStatus($providerRef, 'failed'),
            default => 'ignored',
        };
    }

    private function paymentSucceeded(?string $providerRef): string
    {
        $payment = $this->findPayment($providerRef);

        if (! $payment) {
            return 'unknown_payment';
        }

        $this->payments->markSucceeded($payment);

        return 'processed';
    }

    private function paymentFailed(?string $providerRef, ?string $reason): string
    {
        $payment = $this->findPayment($providerRef);

        if (! $payment) {
            return 'unknown_payment';
        }

        $this->payments->markFailed($payment, $reason);

        return 'processed';
    }

    private function refundStatus(?string $providerRef, string $status): string
    {
        $refund = $providerRef ? Refund::where('provider_ref', $providerRef)->first() : null;

        if (! $refund) {
            return 'unknown_refund';
        }

        $this->refunds->markStatusFromProvider($refund, $status);

        return 'processed';
    }

    private function findPayment(?string $providerRef): ?Payment
    {
        if (! $providerRef) {
            return null;
        }

        $payment = $this->payments->findByProviderRef($providerRef);

        if (! $payment) {
            // Not an error on our side: it can be a payment from another
            // environment sharing the same provider account.
            Log::warning('Webhook for an unknown payment', ['provider_ref' => $providerRef]);
        }

        return $payment;
    }
}
