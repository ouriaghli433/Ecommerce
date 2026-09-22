<?php

namespace Tests\Feature\Order;

use App\Jobs\ExpireOrderJob;
use App\Models\Inventory;
use App\Models\Order;
use App\Models\OrderLine;
use App\Models\Payment;
use App\Models\Product;
use App\Services\Order\OrderService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Queue;
use Tests\TestCase;

class OrderExpirationTest extends TestCase
{
    use RefreshDatabase;

    /** An order whose payment deadline has already passed. */
    private function lateOrder(int $minutesLate = 10): Order
    {
        $product = Product::factory()->create();
        Inventory::factory()->create(['product_id' => $product->id, 'on_hand' => 10, 'reserved' => 2]);

        $order = Order::factory()->create(['expires_at' => now()->subMinutes($minutesLate)]);
        OrderLine::factory()->create(['order_id' => $order->id, 'product_id' => $product->id, 'quantity' => 2]);

        return $order;
    }

    public function test_the_command_queues_a_job_for_each_late_order(): void
    {
        Queue::fake();

        $late = $this->lateOrder();
        $stillOnTime = Order::factory()->create(['expires_at' => now()->addMinutes(10)]);
        $insideGrace = Order::factory()->create(['expires_at' => now()->subSeconds(30)]);

        $this->artisan('orders:expire')->assertSuccessful();

        Queue::assertPushed(ExpireOrderJob::class, 1);
        Queue::assertPushed(fn (ExpireOrderJob $job) => $job->orderId === $late->id);
    }

    public function test_expiring_releases_the_reserved_stock(): void
    {
        $order = $this->lateOrder();
        $productId = $order->lines->first()->product_id;

        (new ExpireOrderJob($order->id))->handle(app(OrderService::class));

        $this->assertSame('expired', $order->fresh()->status);
        $this->assertDatabaseHas('inventories', ['product_id' => $productId, 'on_hand' => 10, 'reserved' => 0]);
        $this->assertDatabaseHas('inventory_movements', ['type' => 'release', 'reason' => 'Order expired']);
    }

    public function test_running_the_job_twice_expires_the_order_once(): void
    {
        $order = $this->lateOrder();

        (new ExpireOrderJob($order->id))->handle(app(OrderService::class));
        (new ExpireOrderJob($order->id))->handle(app(OrderService::class)); // retry

        $this->assertSame('expired', $order->fresh()->status);
        $this->assertSame(1, $order->lines->first()->product->inventoryMovements()->where('type', 'release')->count());
        $this->assertDatabaseHas('inventories', ['reserved' => 0]);
    }

    public function test_an_order_with_a_processing_payment_is_left_alone(): void
    {
        // RG29: the money may be on its way; the late payment rule handles it.
        $order = $this->lateOrder();
        Payment::factory()->processing()->create(['order_id' => $order->id]);

        $expired = app(OrderService::class)->expire($order);

        $this->assertFalse($expired);
        $this->assertSame('pending_payment', $order->fresh()->status);
        $this->assertDatabaseHas('inventories', ['reserved' => 2]);
    }

    public function test_an_order_paid_just_before_the_job_runs_is_not_expired(): void
    {
        $order = $this->lateOrder();
        $order->update(['status' => 'paid', 'paid_at' => now()]);

        $this->assertFalse(app(OrderService::class)->expire($order));
        $this->assertSame('paid', $order->fresh()->status);
    }

    public function test_expiring_closes_an_open_payment(): void
    {
        $order = $this->lateOrder();
        $payment = Payment::factory()->create(['order_id' => $order->id, 'status' => 'pending']);

        app(OrderService::class)->expire($order);

        $this->assertSame('failed', $payment->fresh()->status);
        $this->assertSame('order_expired', $payment->fresh()->failure_reason);
    }

    public function test_an_expired_order_cannot_be_paid_or_cancelled(): void
    {
        $order = $this->lateOrder();
        app(OrderService::class)->expire($order);

        $customer = $order->user;

        $this->actingAs($customer)->postJson("/api/orders/{$order->id}/payments")->assertStatus(409);
        $this->actingAs($customer)->postJson("/api/orders/{$order->id}/cancel")->assertForbidden();
    }
}
