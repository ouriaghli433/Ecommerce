<?php

namespace App\Console\Commands;

use App\Models\Payment;
use App\Services\Webhook\WebhookService;
use Illuminate\Console\Command;
use Illuminate\Support\Str;

/**
 * Development helper: plays the part of the payment provider.
 *
 * The fake provider never sends a webhook by itself, so this command sends
 * one for you:
 *
 *   php artisan payment:simulate fake_pi_abc123
 *   php artisan payment:simulate fake_pi_abc123 --status=failed
 *
 * It goes through the same WebhookService as a real webhook, so the same
 * rules apply (duplicate events, terminal states, late payments).
 */
class SimulatePaymentEventCommand extends Command
{
    protected $signature = 'payment:simulate
                            {provider_ref : The provider reference of the payment}
                            {--status=succeeded : succeeded or failed}';

    protected $description = 'Send a fake payment webhook (development only)';

    public function handle(WebhookService $webhooks): int
    {
        if (app()->isProduction()) {
            $this->error('This command is for development only.');

            return self::FAILURE;
        }

        $providerRef = $this->argument('provider_ref');
        $status = $this->option('status');

        if (! in_array($status, ['succeeded', 'failed'])) {
            $this->error('--status must be succeeded or failed.');

            return self::FAILURE;
        }

        if (! Payment::where('provider_ref', $providerRef)->exists()) {
            $this->warn("No payment found with provider_ref {$providerRef}. Sending the event anyway.");
        }

        $result = $webhooks->handle('fake', [
            'id' => 'evt_'.Str::lower(Str::random(16)),
            'type' => "payment.{$status}",
            'data' => [
                'provider_ref' => $providerRef,
                'failure_reason' => $status === 'failed' ? 'declined' : null,
            ],
        ]);

        $this->info("Event sent. Result: {$result['status']}");

        return self::SUCCESS;
    }
}
