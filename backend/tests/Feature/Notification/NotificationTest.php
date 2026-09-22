<?php

namespace Tests\Feature\Notification;

use App\Jobs\SendOrderNotificationJob;
use App\Models\Address;
use App\Models\Cart;
use App\Models\CartLine;
use App\Models\Inventory;
use App\Models\Notification;
use App\Models\Order;
use App\Models\OrderLine;
use App\Models\Payment;
use App\Models\Product;
use App\Models\User;
use App\Services\Payment\PaymentService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Queue;
use Tests\TestCase;

class NotificationTest extends TestCase
{
    use RefreshDatabase;

    public function test_checkout_queues_a_notification(): void
    {
        Queue::fake();

        $customer = User::factory()->create();
        $address = Address::factory()->create(['user_id' => $customer->id]);
        $product = Product::factory()->create(['price' => 10000]);
        Inventory::factory()->create(['product_id' => $product->id, 'on_hand' => 5]);
        $cart = Cart::factory()->create(['user_id' => $customer->id]);
        CartLine::factory()->create(['cart_id' => $cart->id, 'product_id' => $product->id, 'quantity' => 1]);

        $this->actingAs($customer)->postJson('/api/checkout', ['address_id' => $address->id])->assertCreated();

        Queue::assertPushed(SendOrderNotificationJob::class, fn ($job) => $job->type === 'order_created');
    }

    public function test_paying_queues_a_notification(): void
    {
        Queue::fake();

        $order = Order::factory()->create();
        OrderLine::factory()->create(['order_id' => $order->id]);
        $payment = Payment::factory()->processing()->create(['order_id' => $order->id]);

        app(PaymentService::class)->markSucceeded($payment);

        Queue::assertPushed(SendOrderNotificationJob::class, fn ($job) => $job->type === 'order_paid');
    }

    public function test_the_job_creates_one_notification_even_if_it_runs_twice(): void
    {
        $order = Order::factory()->create();

        (new SendOrderNotificationJob($order->id, 'order_created'))->handle();
        (new SendOrderNotificationJob($order->id, 'order_created'))->handle(); // retry

        $this->assertDatabaseCount('notifications', 1);
        $this->assertDatabaseHas('notifications', [
            'user_id' => $order->user_id,
            'type' => 'order_created',
            'title' => 'Order received',
        ]);
    }

    public function test_the_job_does_nothing_when_the_order_is_gone(): void
    {
        (new SendOrderNotificationJob('00000000-0000-0000-0000-000000000000', 'order_paid'))->handle();

        $this->assertDatabaseCount('notifications', 0);
    }

    public function test_a_customer_lists_their_notifications_with_the_unread_count(): void
    {
        $customer = User::factory()->create();
        Notification::factory()->count(2)->create(['user_id' => $customer->id]);
        Notification::factory()->read()->create(['user_id' => $customer->id]);
        Notification::factory()->create(); // someone else's

        $this->actingAs($customer)->getJson('/api/notifications')
            ->assertOk()
            ->assertJsonCount(3, 'data')
            ->assertJsonPath('meta.unread_count', 2);

        $this->actingAs($customer)->getJson('/api/notifications?unread=1')
            ->assertOk()
            ->assertJsonCount(2, 'data');
    }

    public function test_a_customer_can_mark_one_as_read(): void
    {
        $customer = User::factory()->create();
        $notification = Notification::factory()->create(['user_id' => $customer->id]);

        $this->actingAs($customer)->patchJson("/api/notifications/{$notification->id}/read")
            ->assertOk()
            ->assertJsonPath('data.is_read', true);

        $this->assertNotNull($notification->fresh()->read_at);
    }

    public function test_a_customer_cannot_read_another_customers_notification(): void
    {
        $customer = User::factory()->create();
        $notification = Notification::factory()->create();

        $this->actingAs($customer)->patchJson("/api/notifications/{$notification->id}/read")
            ->assertForbidden();
    }

    public function test_a_customer_can_mark_all_as_read(): void
    {
        $customer = User::factory()->create();
        Notification::factory()->count(3)->create(['user_id' => $customer->id]);

        $this->actingAs($customer)->postJson('/api/notifications/read-all')
            ->assertOk()
            ->assertJsonPath('marked_as_read', 3);

        $this->assertSame(0, $customer->inAppNotifications()->whereNull('read_at')->count());
    }

    public function test_a_guest_has_no_notifications(): void
    {
        $this->getJson('/api/notifications')->assertUnauthorized();
    }
}
