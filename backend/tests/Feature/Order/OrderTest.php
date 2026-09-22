<?php

namespace Tests\Feature\Order;

use App\Models\Order;
use App\Models\OrderLine;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class OrderTest extends TestCase
{
    use RefreshDatabase;

    public function test_a_customer_only_sees_their_own_orders(): void
    {
        $customer = User::factory()->create();
        Order::factory()->count(2)->create(['user_id' => $customer->id]);
        Order::factory()->create(); // someone else's

        $this->actingAs($customer)->getJson('/api/orders')
            ->assertOk()
            ->assertJsonCount(2, 'data')
            ->assertJsonStructure(['data', 'links', 'meta']);
    }

    public function test_an_admin_sees_all_orders_and_can_filter_by_status(): void
    {
        $admin = User::factory()->admin()->create();
        Order::factory()->count(2)->create();
        Order::factory()->status('paid')->create();

        $this->actingAs($admin)->getJson('/api/orders')->assertJsonCount(3, 'data');
        $this->actingAs($admin)->getJson('/api/orders?status=paid')->assertJsonCount(1, 'data');
    }

    public function test_show_returns_lines_and_the_address_snapshot(): void
    {
        $customer = User::factory()->create();
        $order = Order::factory()->create(['user_id' => $customer->id, 'shipping_city' => 'Rabat']);
        OrderLine::factory()->create(['order_id' => $order->id, 'quantity' => 2, 'unit_price' => 15000]);

        $this->actingAs($customer)->getJson("/api/orders/{$order->id}")
            ->assertOk()
            ->assertJsonPath('data.shipping_address.city', 'Rabat')
            ->assertJsonPath('data.lines.0.quantity', 2)
            ->assertJsonPath('data.lines.0.line_total', 30000);
    }

    public function test_a_customer_cannot_see_another_customers_order(): void
    {
        $customer = User::factory()->create();
        $order = Order::factory()->create();

        $this->actingAs($customer)->getJson("/api/orders/{$order->id}")->assertForbidden();
    }

    public function test_a_guest_cannot_list_orders(): void
    {
        $this->getJson('/api/orders')->assertUnauthorized();
    }

    public function test_a_customer_can_cancel_a_pending_order(): void
    {
        $customer = User::factory()->create();
        $order = Order::factory()->create(['user_id' => $customer->id]);

        $this->actingAs($customer)->postJson("/api/orders/{$order->id}/cancel", ['reason' => 'Changed my mind'])
            ->assertOk()
            ->assertJsonPath('data.status', 'cancelled')
            ->assertJsonPath('data.cancel_reason', 'Changed my mind');

        $this->assertNotNull($order->fresh()->cancelled_at);
    }

    public function test_a_customer_cannot_cancel_a_processing_order_but_an_admin_can(): void
    {
        $customer = User::factory()->create();
        $admin = User::factory()->admin()->create();
        $order = Order::factory()->status('processing')->create(['user_id' => $customer->id]);

        $this->actingAs($customer)->postJson("/api/orders/{$order->id}/cancel")->assertForbidden();
        $this->actingAs($admin)->postJson("/api/orders/{$order->id}/cancel")
            ->assertOk()
            ->assertJsonPath('data.status', 'cancelled');
    }

    public function test_a_shipped_order_cannot_be_cancelled(): void
    {
        $admin = User::factory()->admin()->create();
        $order = Order::factory()->status('shipped')->create();

        $this->actingAs($admin)->postJson("/api/orders/{$order->id}/cancel")->assertForbidden();
    }

    public function test_a_customer_cannot_cancel_another_customers_order(): void
    {
        $customer = User::factory()->create();
        $order = Order::factory()->create();

        $this->actingAs($customer)->postJson("/api/orders/{$order->id}/cancel")->assertForbidden();
    }

    public function test_an_admin_moves_an_order_forward(): void
    {
        $admin = User::factory()->admin()->create();
        $order = Order::factory()->status('paid')->create();

        $this->actingAs($admin)->patchJson("/api/orders/{$order->id}/status", ['status' => 'processing'])
            ->assertOk()->assertJsonPath('data.status', 'processing');
        $this->actingAs($admin)->patchJson("/api/orders/{$order->id}/status", ['status' => 'shipped'])
            ->assertOk()->assertJsonPath('data.status', 'shipped');
        $this->actingAs($admin)->patchJson("/api/orders/{$order->id}/status", ['status' => 'delivered'])
            ->assertOk()->assertJsonPath('data.status', 'delivered');
    }

    public function test_status_changes_must_follow_the_transitions_table(): void
    {
        $admin = User::factory()->admin()->create();
        $order = Order::factory()->create(); // pending_payment

        // pending_payment cannot jump to shipped
        $this->actingAs($admin)->patchJson("/api/orders/{$order->id}/status", ['status' => 'shipped'])
            ->assertUnprocessable()->assertJsonValidationErrors('status');

        // paid only comes from a verified payment, never from this endpoint
        $this->actingAs($admin)->patchJson("/api/orders/{$order->id}/status", ['status' => 'paid'])
            ->assertUnprocessable()->assertJsonValidationErrors('status');

        $this->assertSame('pending_payment', $order->fresh()->status);
    }

    public function test_a_customer_cannot_change_the_status(): void
    {
        $customer = User::factory()->create();
        $order = Order::factory()->status('paid')->create(['user_id' => $customer->id]);

        $this->actingAs($customer)->patchJson("/api/orders/{$order->id}/status", ['status' => 'processing'])
            ->assertForbidden();
    }
}
