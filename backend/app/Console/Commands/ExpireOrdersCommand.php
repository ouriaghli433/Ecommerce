<?php

namespace App\Console\Commands;

use App\Jobs\ExpireOrderJob;
use App\Models\Order;
use Illuminate\Console\Command;

/**
 * Finds orders that were not paid in time and queues one job for each (RG29).
 *
 * Runs every minute from routes/console.php. It only SELECTS here and lets
 * the job do the writing, so this command stays fast even with many orders.
 */
class ExpireOrdersCommand extends Command
{
    protected $signature = 'orders:expire';

    protected $description = 'Expire orders that were not paid before their deadline';

    public function handle(): int
    {
        // The grace period gives a payment that is finishing right now a
        // chance to arrive before we expire the order.
        $deadline = now()->subMinutes(config('shop.expiration_grace_minutes'));

        $orders = Order::where('status', 'pending_payment')
            ->where('expires_at', '<=', $deadline)
            ->pluck('id');

        foreach ($orders as $orderId) {
            ExpireOrderJob::dispatch($orderId);
        }

        $this->info("Queued {$orders->count()} order(s) for expiration.");

        return self::SUCCESS;
    }
}
