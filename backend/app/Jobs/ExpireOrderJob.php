<?php

namespace App\Jobs;

use App\Models\Order;
use App\Services\Order\OrderService;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;

/**
 * Expires ONE order (RG29). One job per order keeps each unit of work small
 * and easy to retry.
 *
 * Safe to retry: OrderService::expire() locks the order and checks its status
 * again, so running this job twice expires the order once and does nothing
 * the second time.
 */
class ExpireOrderJob implements ShouldQueue
{
    use Queueable;

    /** Retry 3 times, waiting 10 seconds between tries. */
    public int $tries = 3;

    public int $backoff = 10;

    public function __construct(public string $orderId) {}

    public function handle(OrderService $orders): void
    {
        $order = Order::find($this->orderId);

        if (! $order) {
            return; // deleted meanwhile, nothing to do
        }

        $orders->expire($order);
    }
}
