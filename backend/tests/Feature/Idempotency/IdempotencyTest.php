<?php

namespace Tests\Feature\Idempotency;

use App\Models\Address;
use App\Models\Cart;
use App\Models\CartLine;
use App\Models\IdempotencyKey;
use App\Models\Inventory;
use App\Models\Product;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Testing\TestResponse;
use Tests\TestCase;

class IdempotencyTest extends TestCase
{
    use RefreshDatabase;

    private User $customer;

    private Address $address;

    protected function setUp(): void
    {
        parent::setUp();

        $this->customer = User::factory()->create();
        $this->address = Address::factory()->create(['user_id' => $this->customer->id]);

        $product = Product::factory()->create(['price' => 10000]);
        Inventory::factory()->create(['product_id' => $product->id, 'on_hand' => 10]);
        $cart = Cart::factory()->create(['user_id' => $this->customer->id]);
        CartLine::factory()->create([
            'cart_id' => $cart->id,
            'product_id' => $product->id,
            'quantity' => 1,
            'unit_price' => 10000,
        ]);
    }

    private function checkout(?string $key, array $payload = []): TestResponse
    {
        $headers = $key ? ['Idempotency-Key' => $key] : [];

        return $this->actingAs($this->customer)->withHeaders($headers)->postJson('/api/checkout', array_merge([
            'address_id' => $this->address->id,
        ], $payload));
    }

    public function test_the_same_key_and_body_replays_the_first_answer(): void
    {
        $first = $this->checkout('key-1')->assertCreated();

        $second = $this->checkout('key-1')->assertCreated();

        // same order id, and no second order was created
        $this->assertSame($first->json('data.id'), $second->json('data.id'));
        $this->assertSame('true', $second->headers->get('Idempotency-Replayed'));
        $this->assertDatabaseCount('orders', 1);
        $this->assertDatabaseCount('order_lines', 1);

        // the stock was reserved once
        $this->assertDatabaseHas('inventories', ['reserved' => 1]);
    }

    public function test_the_same_key_with_a_different_body_is_refused(): void
    {
        $this->checkout('key-2')->assertCreated();

        $otherAddress = Address::factory()->create(['user_id' => $this->customer->id]);

        $this->checkout('key-2', ['address_id' => $otherAddress->id])
            ->assertStatus(409)
            ->assertJsonPath('message', 'This Idempotency-Key was already used with a different request.');

        $this->assertDatabaseCount('orders', 1);
    }

    public function test_a_key_still_running_is_refused(): void
    {
        // A row with no stored answer means "a copy of this request is running".
        IdempotencyKey::create([
            'user_id' => $this->customer->id,
            'key' => 'key-3',
            'request_method' => 'POST',
            'request_path' => 'api/checkout',
            'request_hash' => hash('sha256', json_encode(['address_id' => $this->address->id])),
            'expires_at' => now()->addDay(),
        ]);

        $this->checkout('key-3')
            ->assertStatus(409)
            ->assertJsonPath('message', 'A request with this Idempotency-Key is still running.');

        $this->assertDatabaseCount('orders', 0);
    }

    public function test_without_a_key_nothing_changes(): void
    {
        $this->checkout(null)->assertCreated();

        $this->assertDatabaseCount('idempotency_keys', 0);
    }

    public function test_the_key_belongs_to_one_user_only(): void
    {
        $this->checkout('shared-key')->assertCreated();

        // another customer using the same key string is not affected
        $other = User::factory()->create();
        $otherAddress = Address::factory()->create(['user_id' => $other->id]);
        $product = Product::factory()->create(['price' => 10000]);
        Inventory::factory()->create(['product_id' => $product->id, 'on_hand' => 5]);
        $cart = Cart::factory()->create(['user_id' => $other->id]);
        CartLine::factory()->create(['cart_id' => $cart->id, 'product_id' => $product->id, 'quantity' => 1]);

        $this->actingAs($other)
            ->withHeaders(['Idempotency-Key' => 'shared-key'])
            ->postJson('/api/checkout', ['address_id' => $otherAddress->id])
            ->assertCreated();

        $this->assertDatabaseCount('orders', 2);
    }

    public function test_a_failed_request_is_replayed_too(): void
    {
        // 422 is a real answer: replaying it keeps the client consistent.
        $this->checkout('key-4', ['address_id' => Address::factory()->create()->id])
            ->assertUnprocessable();

        $this->checkout('key-4', ['address_id' => Address::factory()->create()->id])
            ->assertStatus(409); // different body -> different request

        $this->assertDatabaseCount('orders', 0);
    }

    public function test_a_payment_cannot_be_started_twice_with_the_same_key(): void
    {
        $order = $this->checkout('key-5')->assertCreated()->json('data.id');

        $first = $this->actingAs($this->customer)
            ->withHeaders(['Idempotency-Key' => 'pay-1'])
            ->postJson("/api/orders/{$order}/payments")->assertCreated();

        $second = $this->actingAs($this->customer)
            ->withHeaders(['Idempotency-Key' => 'pay-1'])
            ->postJson("/api/orders/{$order}/payments")->assertCreated();

        $this->assertSame($first->json('payment.id'), $second->json('payment.id'));
        $this->assertDatabaseCount('payments', 1);
    }

    public function test_expired_keys_are_pruned(): void
    {
        $this->checkout('key-6')->assertCreated();
        IdempotencyKey::query()->update(['expires_at' => now()->subDay()]);

        $this->artisan('idempotency:prune')->assertSuccessful();

        $this->assertDatabaseCount('idempotency_keys', 0);
    }
}
