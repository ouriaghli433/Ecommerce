<?php

namespace Tests\Feature\Refund;

use App\Models\Order;
use App\Models\Payment;
use App\Models\Refund;
use App\Models\User;
use App\Services\Refund\RefundService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class RefundTest extends TestCase
{
    use RefreshDatabase;

    private function succeededPayment(int $amount = 20000): Payment
    {
        $order = Order::factory()->status('paid')->create(['total_amount' => $amount]);

        return Payment::factory()->succeeded()->create(['order_id' => $order->id, 'amount' => $amount]);
    }

    public function test_an_admin_can_refund_a_payment(): void
    {
        $admin = User::factory()->admin()->create();
        $payment = $this->succeededPayment();

        $this->actingAs($admin)->postJson("/api/payments/{$payment->id}/refunds", [
            'amount' => 5000,
            'reason' => 'customer_request',
        ])->assertCreated()
            ->assertJsonPath('data.amount', 5000)
            ->assertJsonPath('data.status', 'succeeded')   // the fake provider always accepts
            ->assertJsonPath('data.reason', 'customer_request');

        $this->assertDatabaseHas('refunds', ['payment_id' => $payment->id, 'created_by' => $admin->id]);
    }

    public function test_a_customer_cannot_refund(): void
    {
        $customer = User::factory()->create();
        $payment = $this->succeededPayment();

        $this->actingAs($customer)->postJson("/api/payments/{$payment->id}/refunds", [
            'amount' => 1000,
            'reason' => 'customer_request',
        ])->assertForbidden();
    }

    public function test_refunds_cannot_pass_the_payment_amount(): void
    {
        $admin = User::factory()->admin()->create();
        $payment = $this->succeededPayment(20000);

        // 15000 already given back
        Refund::factory()->create(['payment_id' => $payment->id, 'amount' => 15000, 'status' => 'succeeded']);

        $this->actingAs($admin)->postJson("/api/payments/{$payment->id}/refunds", [
            'amount' => 6000,
            'reason' => 'admin',
        ])->assertUnprocessable()->assertJsonValidationErrors('amount');

        // exactly what is left is fine
        $this->actingAs($admin)->postJson("/api/payments/{$payment->id}/refunds", [
            'amount' => 5000,
            'reason' => 'admin',
        ])->assertCreated();
    }

    public function test_a_failed_refund_does_not_block_the_amount(): void
    {
        $payment = $this->succeededPayment(10000);
        Refund::factory()->create(['payment_id' => $payment->id, 'amount' => 10000, 'status' => 'failed']);

        $refund = app(RefundService::class)->create($payment, 10000, 'admin');

        $this->assertSame('succeeded', $refund->status);
    }

    public function test_only_a_succeeded_payment_can_be_refunded(): void
    {
        $admin = User::factory()->admin()->create();
        $order = Order::factory()->create();
        $payment = Payment::factory()->processing()->create(['order_id' => $order->id]);

        $this->actingAs($admin)->postJson("/api/payments/{$payment->id}/refunds", [
            'amount' => 1000,
            'reason' => 'admin',
        ])->assertUnprocessable()->assertJsonValidationErrors('payment');
    }

    public function test_refund_input_is_validated(): void
    {
        $admin = User::factory()->admin()->create();
        $payment = $this->succeededPayment();

        $this->actingAs($admin)->postJson("/api/payments/{$payment->id}/refunds", [
            'amount' => 0,
            'reason' => 'late_payment', // system only
        ])->assertUnprocessable()->assertJsonValidationErrors(['amount', 'reason']);
    }

    public function test_refund_progress_is_only_on_the_refund(): void
    {
        $payment = $this->succeededPayment();

        app(RefundService::class)->create($payment, 1000, 'admin');

        // RG35: the order has no refund column, its status is untouched
        $this->assertSame('paid', $payment->order->fresh()->status);
    }
}
