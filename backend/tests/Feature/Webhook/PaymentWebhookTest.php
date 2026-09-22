<?php

namespace Tests\Feature\Webhook;

use App\Models\Inventory;
use App\Models\InventoryMovement;
use App\Models\Order;
use App\Models\OrderLine;
use App\Models\Payment;
use App\Models\Product;
use App\Models\Refund;
use App\Models\WebhookEvent;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Testing\TestResponse;
use Tests\TestCase;

class PaymentWebhookTest extends TestCase
{
    use RefreshDatabase;

    private const URL = '/api/webhooks/payments/fake';

    /**
     * Send a webhook the way the provider would: the signature is the HMAC
     * of the exact JSON body with the shared secret.
     */
    private function sendEvent(array $payload, ?string $signature = null): TestResponse
    {
        $body = json_encode($payload);

        return $this->call(
            'POST',
            self::URL,
            [], [], [],
            [
                'CONTENT_TYPE' => 'application/json',
                'HTTP_ACCEPT' => 'application/json',
                'HTTP_X_SIGNATURE' => $signature ?? hash_hmac('sha256', $body, config('payment.webhook_secret')),
            ],
            $body,
        );
    }

    private function orderWaitingForPayment(): Payment
    {
        $product = Product::factory()->create();
        Inventory::factory()->create(['product_id' => $product->id, 'on_hand' => 10, 'reserved' => 2]);

        $order = Order::factory()->create(['total_amount' => 20000]);
        OrderLine::factory()->create(['order_id' => $order->id, 'product_id' => $product->id, 'quantity' => 2]);

        return Payment::factory()->processing()->create(['order_id' => $order->id, 'amount' => 20000]);
    }

    public function test_a_valid_event_pays_the_order(): void
    {
        $payment = $this->orderWaitingForPayment();

        $this->sendEvent([
            'id' => 'evt_1',
            'type' => 'payment.succeeded',
            'data' => ['provider_ref' => $payment->provider_ref],
        ])->assertOk()->assertJsonPath('status', 'processed');

        $this->assertSame('succeeded', $payment->fresh()->status);
        $this->assertSame('paid', $payment->order->fresh()->status);

        $this->assertDatabaseHas('webhook_events', [
            'provider_event_id' => 'evt_1',
            'event_type' => 'payment.succeeded',
        ]);
        $this->assertNotNull(WebhookEvent::first()->processed_at);
    }

    public function test_a_wrong_signature_is_rejected(): void
    {
        $payment = $this->orderWaitingForPayment();

        $this->sendEvent([
            'id' => 'evt_2',
            'type' => 'payment.succeeded',
            'data' => ['provider_ref' => $payment->provider_ref],
        ], signature: 'not-the-right-signature')
            ->assertUnauthorized()
            ->assertJsonPath('message', 'Invalid signature.');

        $this->assertSame('processing', $payment->fresh()->status);
        $this->assertDatabaseCount('webhook_events', 0);
    }

    public function test_a_missing_signature_is_rejected(): void
    {
        $this->postJson(self::URL, ['id' => 'evt_3', 'type' => 'payment.succeeded', 'data' => []])
            ->assertUnauthorized();
    }

    public function test_the_same_event_delivered_twice_is_processed_once(): void
    {
        $payment = $this->orderWaitingForPayment();

        $event = [
            'id' => 'evt_same',
            'type' => 'payment.succeeded',
            'data' => ['provider_ref' => $payment->provider_ref],
        ];

        $this->sendEvent($event)->assertOk()->assertJsonPath('status', 'processed');
        $this->sendEvent($event)->assertOk()->assertJsonPath('status', 'already_received');

        $this->assertDatabaseCount('webhook_events', 1);
        // the stock was sold once only
        $this->assertSame(1, InventoryMovement::where('type', 'sale')->count());
    }

    public function test_a_failed_event_leaves_the_order_pending(): void
    {
        $payment = $this->orderWaitingForPayment();

        $this->sendEvent([
            'id' => 'evt_failed',
            'type' => 'payment.failed',
            'data' => ['provider_ref' => $payment->provider_ref, 'failure_reason' => 'declined'],
        ])->assertOk();

        $this->assertSame('failed', $payment->fresh()->status);
        $this->assertSame('declined', $payment->fresh()->failure_reason);
        $this->assertSame('pending_payment', $payment->order->fresh()->status);
    }

    public function test_an_event_that_contradicts_a_terminal_state_is_ignored(): void
    {
        $payment = $this->orderWaitingForPayment();
        $payment->update(['status' => 'failed', 'failure_reason' => 'declined']);

        $this->sendEvent([
            'id' => 'evt_late_success',
            'type' => 'payment.succeeded',
            'data' => ['provider_ref' => $payment->provider_ref],
        ])->assertOk();

        $this->assertSame('failed', $payment->fresh()->status);
        $this->assertSame('pending_payment', $payment->order->fresh()->status);
    }

    public function test_a_late_payment_creates_a_refund_and_keeps_the_order_expired(): void
    {
        $payment = $this->orderWaitingForPayment();
        $payment->order->update(['status' => 'expired']);

        $this->sendEvent([
            'id' => 'evt_late',
            'type' => 'payment.succeeded',
            'data' => ['provider_ref' => $payment->provider_ref],
        ])->assertOk();

        $this->assertSame('succeeded', $payment->fresh()->status);
        $this->assertSame('expired', $payment->order->fresh()->status);
        $this->assertDatabaseHas('refunds', ['reason' => 'late_payment', 'amount' => 20000]);
    }

    public function test_an_unknown_payment_is_stored_but_changes_nothing(): void
    {
        $this->sendEvent([
            'id' => 'evt_unknown',
            'type' => 'payment.succeeded',
            'data' => ['provider_ref' => 'fake_pi_does_not_exist'],
        ])->assertOk()->assertJsonPath('status', 'unknown_payment');

        $this->assertDatabaseCount('webhook_events', 1);
    }

    public function test_an_unknown_event_type_is_ignored(): void
    {
        $this->sendEvent([
            'id' => 'evt_other',
            'type' => 'invoice.printed',
            'data' => ['provider_ref' => 'x'],
        ])->assertOk()->assertJsonPath('status', 'ignored');
    }

    public function test_a_refund_event_updates_the_refund(): void
    {
        $payment = Payment::factory()->succeeded()->create();
        $refund = Refund::factory()->create([
            'payment_id' => $payment->id,
            'status' => 'pending',
            'provider_ref' => 'fake_re_123',
        ]);

        $this->sendEvent([
            'id' => 'evt_refund',
            'type' => 'refund.succeeded',
            'data' => ['provider_ref' => 'fake_re_123'],
        ])->assertOk()->assertJsonPath('status', 'processed');

        $this->assertSame('succeeded', $refund->fresh()->status);
    }

    public function test_the_event_body_is_validated(): void
    {
        $this->sendEvent(['type' => 'payment.succeeded'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['id', 'data']);
    }
}
