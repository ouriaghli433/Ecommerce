<?php

namespace App\Jobs;

use App\Models\Notification;
use App\Models\Order;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\Log;
use Throwable;

/**
 * Tells the customer what happened to their order.
 *
 * This is a SIDE EFFECT: the order is already saved when this job runs. If
 * the notification fails, the order is still correct. That is why it is
 * queued, while stock and money stay inside synchronous transactions.
 *
 * Safe to retry: the notification row is created with firstOrCreate, so
 * running the job twice leaves one notification, not two.
 */
class SendOrderNotificationJob implements ShouldQueue
{
    use Queueable;

    public int $tries = 3;

    public int $backoff = 10;

    public function __construct(
        public string $orderId,
        public string $type,
    ) {}

    public function handle(): void
    {
        $order = Order::find($this->orderId);

        if (! $order) {
            return;
        }

        $text = $this->textFor($order);

        $notification = Notification::firstOrCreate(
            [
                'user_id' => $order->user_id,
                'type' => $this->type,
                'title' => $text['title'],
                'message' => $text['message'],
            ],
        );

        // A real app would send an email here. The log shows the same thing
        // without needing a mail server.
        Log::info('Notification ready to send', [
            'notification_id' => $notification->id,
            'user_id' => $order->user_id,
            'type' => $this->type,
        ]);
    }

    /**
     * @return array{title: string, message: string}
     */
    private function textFor(Order $order): array
    {
        $short = substr($order->id, 0, 8);

        return match ($this->type) {
            'order_created' => [
                'title' => 'Order received',
                'message' => "Your order {$short} is waiting for payment.",
            ],
            'order_paid' => [
                'title' => 'Payment received',
                'message' => "We received your payment for order {$short}. Thank you!",
            ],
            'order_cancelled' => [
                'title' => 'Order cancelled',
                'message' => "Your order {$short} was cancelled.",
            ],
            'order_expired' => [
                'title' => 'Order expired',
                'message' => "Your order {$short} expired because it was not paid in time.",
            ],
            'refund_processed' => [
                'title' => 'Refund sent',
                'message' => "A refund for order {$short} is on its way back to you.",
            ],
            default => [
                'title' => 'Order update',
                'message' => "Your order {$short} changed.",
            ],
        };
    }

    /**
     * Called when the job failed all its tries. The order is untouched, so we
     * only need to know about it.
     */
    public function failed(Throwable $exception): void
    {
        Log::error('Order notification failed', [
            'order_id' => $this->orderId,
            'type' => $this->type,
            'error' => $exception->getMessage(),
        ]);
    }
}
