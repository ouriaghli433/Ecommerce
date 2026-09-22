<?php

namespace Tests\Feature\Order;

use App\Models\Inventory;
use App\Models\Order;
use App\Models\OrderLine;
use App\Models\Payment;
use App\Models\Product;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class OrderCancellationTest extends TestCase
{
    use RefreshDatabase;

    private User $customer;

    protected function setUp(): void
    {
        parent::setUp();
        $this->customer = User::factory()->create();
    }

    private function orderWithReservedStock(string $status = 'pending_payment'): Order
    {
        $product = Product::factory()->create();
        Inventory::factory()->create(['product_id' => $product->id, 'on_hand' => 10, 'reserved' => 3]);

        $order = Order::factory()->status($status)->create(['user_id' => $this->customer->id, 'total_amount' => 30000]);
        OrderLine::factory()->create(['order_id' => $order->id, 'product_id' => $product->id, 'quantity' => 3]);

        return $order;
    }

    public function test_cancelling_a_pending_order_releases_the_stock(): void
    {
        $order = $this->orderWithReservedStock();
        $productId = $order->lines->first()->product_id;

        $this->actingAs($this->customer)->postJson("/api/orders/{$order->id}/cancel", ['reason' => 'Too slow'])
            ->assertOk()
            ->assertJsonPath('data.status', 'cancelled');

        // RG12: the reserved units go back to the shop, on_hand never moved
        $this->assertDatabaseHas('inventories', ['product_id' => $productId, 'on_hand' => 10, 'reserved' => 0]);
        $this->assertDatabaseHas('inventory_movements', ['type' => 'release', 'quantity' => -3]);
    }

    public function test_cancelling_also_closes_an_open_payment(): void
    {
        $order = $this->orderWithReservedStock();
        $payment = Payment::factory()->processing()->create(['order_id' => $order->id]);

        $this->actingAs($this->customer)->postJson("/api/orders/{$order->id}/cancel")->assertOk();

        $this->assertSame('failed', $payment->fresh()->status);
        $this->assertSame('order_expired', $payment->fresh()->failure_reason);
    }

    public function test_cancelling_a_paid_order_creates_a_refund(): void
    {
        $order = $this->orderWithReservedStock('paid');
        $payment = Payment::factory()->succeeded()->create(['order_id' => $order->id, 'amount' => 30000]);

        $this->actingAs($this->customer)->postJson("/api/orders/{$order->id}/cancel")
            ->assertOk()
            ->assertJsonPath('data.status', 'cancelled');

        $this->assertDatabaseHas('refunds', [
            'payment_id' => $payment->id,
            'amount' => 30000,
            'reason' => 'order_cancelled',
            'status' => 'succeeded',
        ]);

        // stock was already sold when the order was paid, so nothing is released
        $this->assertDatabaseMissing('inventory_movements', ['type' => 'release']);
    }

    public function test_an_admin_can_cancel_a_processing_order(): void
    {
        $admin = User::factory()->admin()->create();
        $order = $this->orderWithReservedStock('processing');
        Payment::factory()->succeeded()->create(['order_id' => $order->id, 'amount' => 30000]);

        $this->actingAs($this->customer)->postJson("/api/orders/{$order->id}/cancel")->assertForbidden();
        $this->actingAs($admin)->postJson("/api/orders/{$order->id}/cancel")->assertOk();

        $this->assertDatabaseHas('refunds', ['reason' => 'order_cancelled']);
    }

    public function test_a_terminal_order_cannot_be_cancelled(): void
    {
        $admin = User::factory()->admin()->create();

        foreach (['delivered', 'cancelled', 'expired'] as $status) {
            $order = Order::factory()->status($status)->create(['user_id' => $this->customer->id]);

            $this->actingAs($admin)->postJson("/api/orders/{$order->id}/cancel")->assertForbidden();
        }
    }
}
