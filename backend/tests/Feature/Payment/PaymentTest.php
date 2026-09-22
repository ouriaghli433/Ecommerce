<?php

namespace Tests\Feature\Payment;

use App\Models\Inventory;
use App\Models\InventoryMovement;
use App\Models\Order;
use App\Models\OrderLine;
use App\Models\Payment;
use App\Models\Product;
use App\Models\User;
use App\Services\Payment\PaymentService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PaymentTest extends TestCase
{
    use RefreshDatabase;

    private User $customer;

    protected function setUp(): void
    {
        parent::setUp();
        $this->customer = User::factory()->create();
    }

    /** An order waiting for payment, with 2 units reserved. */
    private function pendingOrder(int $onHand = 10, int $reserved = 2, int $quantity = 2): Order
    {
        $product = Product::factory()->create(['price' => 10000]);
        Inventory::factory()->create([
            'product_id' => $product->id,
            'on_hand' => $onHand,
            'reserved' => $reserved,
        ]);

        $order = Order::factory()->create([
            'user_id' => $this->customer->id,
            'total_amount' => 20000,
            'expires_at' => now()->addMinutes(20),
        ]);

        OrderLine::factory()->create([
            'order_id' => $order->id,
            'product_id' => $product->id,
            'quantity' => $quantity,
            'unit_price' => 10000,
        ]);

        return $order;
    }

    public function test_a_customer_can_start_a_payment(): void
    {
        $order = $this->pendingOrder();

        $this->actingAs($this->customer)->postJson("/api/orders/{$order->id}/payments")
            ->assertCreated()
            ->assertJsonPath('payment.status', 'processing')
            ->assertJsonPath('payment.amount', 20000)
            ->assertJsonPath('payment.provider', 'fake')
            ->assertJsonStructure(['payment' => ['id', 'provider_ref'], 'checkout_url']);

        // The order is NOT paid yet: only a webhook can do that (RG32).
        $this->assertSame('pending_payment', $order->fresh()->status);
    }

    public function test_only_one_active_payment_per_order(): void
    {
        $order = $this->pendingOrder();

        $this->actingAs($this->customer)->postJson("/api/orders/{$order->id}/payments")->assertCreated();

        $this->actingAs($this->customer)->postJson("/api/orders/{$order->id}/payments")
            ->assertStatus(409)
            ->assertJsonPath('message', 'A payment is already in progress for this order.');

        $this->assertDatabaseCount('payments', 1);
    }

    public function test_a_failed_payment_lets_the_customer_try_again(): void
    {
        $order = $this->pendingOrder();
        $payment = Payment::factory()->failed()->create(['order_id' => $order->id]);

        $this->actingAs($this->customer)->postJson("/api/orders/{$order->id}/payments")->assertCreated();

        $this->assertSame('pending_payment', $order->fresh()->status);
        $this->assertDatabaseCount('payments', 2);
        $this->assertSame('failed', $payment->fresh()->status);
    }

    public function test_an_expired_order_cannot_be_paid(): void
    {
        $order = $this->pendingOrder();
        $order->update(['expires_at' => now()->subMinute()]);

        $this->actingAs($this->customer)->postJson("/api/orders/{$order->id}/payments")
            ->assertStatus(409);

        $this->assertDatabaseCount('payments', 0);
    }

    public function test_a_cancelled_order_cannot_be_paid(): void
    {
        $order = $this->pendingOrder();
        $order->update(['status' => 'cancelled']);

        $this->actingAs($this->customer)->postJson("/api/orders/{$order->id}/payments")->assertStatus(409);
    }

    public function test_another_customer_cannot_pay_my_order(): void
    {
        $order = $this->pendingOrder();
        $other = User::factory()->create();

        $this->actingAs($other)->postJson("/api/orders/{$order->id}/payments")->assertForbidden();
    }

    public function test_a_successful_payment_pays_the_order_and_sells_the_stock(): void
    {
        $order = $this->pendingOrder(onHand: 10, reserved: 2, quantity: 2);
        $payment = Payment::factory()->processing()->create(['order_id' => $order->id, 'amount' => 20000]);

        app(PaymentService::class)->markSucceeded($payment);

        $this->assertSame('paid', $order->fresh()->status);
        $this->assertNotNull($order->fresh()->paid_at);
        $this->assertSame('succeeded', $payment->fresh()->status);

        // reservation became a sale: both numbers go down (RG11)
        $this->assertDatabaseHas('inventories', [
            'product_id' => $order->lines->first()->product_id,
            'on_hand' => 8,
            'reserved' => 0,
        ]);
        $this->assertDatabaseHas('inventory_movements', ['type' => 'sale', 'quantity' => -2]);
    }

    public function test_a_repeated_success_changes_nothing(): void
    {
        $order = $this->pendingOrder();
        $payment = Payment::factory()->processing()->create(['order_id' => $order->id]);

        $service = app(PaymentService::class);
        $service->markSucceeded($payment);
        $service->markSucceeded($payment); // duplicate event

        $this->assertSame('paid', $order->fresh()->status);
        $this->assertDatabaseCount('refunds', 0);
        // the stock was sold once, not twice
        $this->assertSame(1, InventoryMovement::where('type', 'sale')->count());
    }

    public function test_a_failed_payment_leaves_the_order_pending(): void
    {
        $order = $this->pendingOrder();
        $payment = Payment::factory()->processing()->create(['order_id' => $order->id]);

        app(PaymentService::class)->markFailed($payment, 'declined');

        $this->assertSame('failed', $payment->fresh()->status);
        $this->assertSame('declined', $payment->fresh()->failure_reason);
        $this->assertSame('pending_payment', $order->fresh()->status); // RG33
    }

    public function test_a_success_event_for_a_failed_payment_is_ignored(): void
    {
        $order = $this->pendingOrder();
        $payment = Payment::factory()->failed()->create(['order_id' => $order->id]);

        app(PaymentService::class)->markSucceeded($payment);

        $this->assertSame('failed', $payment->fresh()->status);
        $this->assertSame('pending_payment', $order->fresh()->status);
    }

    public function test_a_late_payment_refunds_itself_and_keeps_the_order_terminal(): void
    {
        // RG30: the order already expired, then the money arrives.
        $order = $this->pendingOrder();
        $order->update(['status' => 'expired']);
        $payment = Payment::factory()->processing()->create(['order_id' => $order->id, 'amount' => 20000]);

        app(PaymentService::class)->markSucceeded($payment);

        $this->assertSame('succeeded', $payment->fresh()->status);
        $this->assertSame('expired', $order->fresh()->status); // not reactivated

        $this->assertDatabaseHas('refunds', [
            'payment_id' => $payment->id,
            'amount' => 20000,
            'reason' => 'late_payment',
            'status' => 'succeeded',
        ]);
    }

    public function test_a_customer_sees_their_payments_and_others_do_not(): void
    {
        $order = $this->pendingOrder();
        $payment = Payment::factory()->create(['order_id' => $order->id]);
        $other = User::factory()->create();
        $admin = User::factory()->admin()->create();

        $this->actingAs($this->customer)->getJson("/api/orders/{$order->id}/payments")
            ->assertOk()->assertJsonCount(1, 'data');
        $this->actingAs($this->customer)->getJson("/api/payments/{$payment->id}")->assertOk();
        $this->actingAs($admin)->getJson("/api/payments/{$payment->id}")->assertOk();
        $this->actingAs($other)->getJson("/api/payments/{$payment->id}")->assertForbidden();
    }
}
