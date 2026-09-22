<?php

namespace Tests\Feature\Checkout;

use App\Models\Address;
use App\Models\Cart;
use App\Models\CartLine;
use App\Models\Coupon;
use App\Models\Inventory;
use App\Models\Order;
use App\Models\Product;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Testing\TestResponse;
use Tests\TestCase;

class CheckoutTest extends TestCase
{
    use RefreshDatabase;

    private User $customer;

    private Address $address;

    protected function setUp(): void
    {
        parent::setUp();

        $this->customer = User::factory()->create();
        $this->address = Address::factory()->create(['user_id' => $this->customer->id, 'city' => 'Rabat']);
    }

    /** Puts a product in the customer's cart and returns it. */
    private function cartWith(int $quantity = 2, int $price = 10000, int $onHand = 10, int $reserved = 0): Product
    {
        $product = Product::factory()->create(['price' => $price]);
        Inventory::factory()->create([
            'product_id' => $product->id,
            'on_hand' => $onHand,
            'reserved' => $reserved,
        ]);

        $cart = Cart::factory()->create(['user_id' => $this->customer->id]);
        CartLine::factory()->create([
            'cart_id' => $cart->id,
            'product_id' => $product->id,
            'quantity' => $quantity,
            'unit_price' => $price,
        ]);

        return $product;
    }

    private function checkout(array $payload = []): TestResponse
    {
        return $this->actingAs($this->customer)->postJson('/api/checkout', array_merge([
            'address_id' => $this->address->id,
        ], $payload));
    }

    public function test_checkout_creates_an_order_and_reserves_stock(): void
    {
        $product = $this->cartWith(quantity: 2, price: 10000, onHand: 10);

        $response = $this->checkout();

        $response->assertCreated()
            ->assertJsonPath('data.status', 'pending_payment')
            ->assertJsonPath('data.subtotal', 20000)
            ->assertJsonPath('data.shipping_amount', 3000)   // below the free shipping limit
            ->assertJsonPath('data.total_amount', 23000)
            ->assertJsonPath('data.lines.0.quantity', 2)
            ->assertJsonPath('data.shipping_address.city', 'Rabat');

        // stock is held, not sold yet
        $this->assertDatabaseHas('inventories', [
            'product_id' => $product->id,
            'on_hand' => 10,
            'reserved' => 2,
        ]);

        $this->assertDatabaseHas('inventory_movements', [
            'product_id' => $product->id,
            'type' => 'reservation',
            'quantity' => 2,
        ]);
    }

    public function test_checkout_converts_the_cart_and_sets_an_expiry(): void
    {
        $this->cartWith();

        $this->checkout()->assertCreated();

        $this->assertDatabaseHas('carts', [
            'user_id' => $this->customer->id,
            'status' => 'converted',
        ]);

        $order = Order::first();
        $this->assertTrue($order->expires_at->isFuture());
        $this->assertSame(0, $this->customer->carts()->where('status', 'active')->count());
    }

    public function test_free_shipping_above_the_limit(): void
    {
        $this->cartWith(quantity: 1, price: 60000);

        $this->checkout()
            ->assertCreated()
            ->assertJsonPath('data.shipping_amount', 0)
            ->assertJsonPath('data.total_amount', 60000);
    }

    public function test_the_order_uses_the_current_price_not_the_cart_price(): void
    {
        $product = $this->cartWith(quantity: 1, price: 10000);
        $product->update(['price' => 12000]); // price changed while the cart waited

        $this->checkout()
            ->assertCreated()
            ->assertJsonPath('data.subtotal', 12000)
            ->assertJsonPath('data.lines.0.unit_price', 12000);
    }

    public function test_checkout_needs_a_cart_with_lines(): void
    {
        $this->checkout()->assertUnprocessable()->assertJsonValidationErrors('cart');

        Cart::factory()->create(['user_id' => $this->customer->id]); // empty cart
        $this->checkout()->assertUnprocessable()->assertJsonValidationErrors('cart');
    }

    public function test_checkout_refuses_another_customers_address(): void
    {
        $this->cartWith();
        $someoneElse = Address::factory()->create();

        $this->checkout(['address_id' => $someoneElse->id])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('address_id');
    }

    public function test_checkout_refuses_more_than_the_available_stock(): void
    {
        // 10 on hand but 9 already reserved by other orders -> only 1 available
        $product = $this->cartWith(quantity: 2, onHand: 10, reserved: 9);

        $this->checkout()->assertUnprocessable()->assertJsonValidationErrors('cart');

        // nothing changed
        $this->assertDatabaseHas('inventories', ['product_id' => $product->id, 'reserved' => 9]);
        $this->assertDatabaseCount('orders', 0);
        $this->assertDatabaseHas('carts', ['user_id' => $this->customer->id, 'status' => 'active']);
    }

    public function test_checkout_refuses_an_inactive_product(): void
    {
        $product = $this->cartWith();
        $product->update(['is_active' => false]);

        $this->checkout()->assertUnprocessable()->assertJsonValidationErrors('cart');
        $this->assertDatabaseCount('orders', 0);
    }

    public function test_a_percent_coupon_is_applied_by_the_server(): void
    {
        $this->cartWith(quantity: 1, price: 60000);
        Coupon::factory()->create(['code' => 'SAVE10', 'type' => 'percent', 'value' => 10]);

        $this->checkout(['coupon_code' => 'SAVE10'])
            ->assertCreated()
            ->assertJsonPath('data.subtotal', 60000)
            ->assertJsonPath('data.discount_amount', 6000)
            ->assertJsonPath('data.total_amount', 54000)
            ->assertJsonPath('data.coupon_code', 'SAVE10');
    }

    public function test_a_fixed_coupon_never_goes_below_zero(): void
    {
        $this->cartWith(quantity: 1, price: 5000);
        Coupon::factory()->create(['code' => 'BIG', 'type' => 'fixed', 'value' => 999999]);

        $this->checkout(['coupon_code' => 'BIG'])
            ->assertCreated()
            ->assertJsonPath('data.discount_amount', 5000)
            ->assertJsonPath('data.total_amount', 3000); // only shipping left
    }

    public function test_coupon_rules_are_checked(): void
    {
        $this->cartWith(quantity: 1, price: 10000);

        $this->checkout(['coupon_code' => 'NOPE'])->assertJsonValidationErrors('coupon_code');

        Coupon::factory()->create(['code' => 'OFF', 'is_active' => false]);
        $this->checkout(['coupon_code' => 'OFF'])->assertJsonValidationErrors('coupon_code');

        Coupon::factory()->create(['code' => 'OLD', 'expires_at' => now()->subDay()]);
        $this->checkout(['coupon_code' => 'OLD'])->assertJsonValidationErrors('coupon_code');

        Coupon::factory()->create(['code' => 'SOON', 'starts_at' => now()->addDay()]);
        $this->checkout(['coupon_code' => 'SOON'])->assertJsonValidationErrors('coupon_code');

        Coupon::factory()->create(['code' => 'BIGORDER', 'min_order_amount' => 100000]);
        $this->checkout(['coupon_code' => 'BIGORDER'])->assertJsonValidationErrors('coupon_code');

        $this->assertDatabaseCount('orders', 0);
    }

    public function test_the_total_usage_limit_is_respected(): void
    {
        $coupon = Coupon::factory()->create(['code' => 'ONCE', 'max_usage' => 1]);
        Order::factory()->create(['coupon_id' => $coupon->id]); // already used once

        $this->cartWith();
        $this->checkout(['coupon_code' => 'ONCE'])->assertJsonValidationErrors('coupon_code');
    }

    public function test_the_per_user_limit_is_respected(): void
    {
        $coupon = Coupon::factory()->create(['code' => 'ONEPER', 'per_user_limit' => 1]);
        Order::factory()->create(['coupon_id' => $coupon->id, 'user_id' => $this->customer->id]);

        $this->cartWith();
        $this->checkout(['coupon_code' => 'ONEPER'])->assertJsonValidationErrors('coupon_code');
    }

    public function test_cancelled_orders_do_not_use_up_a_coupon(): void
    {
        $coupon = Coupon::factory()->create(['code' => 'AGAIN', 'max_usage' => 1]);
        Order::factory()->status('cancelled')->create(['coupon_id' => $coupon->id]);

        $this->cartWith();
        $this->checkout(['coupon_code' => 'AGAIN'])->assertCreated();
    }

    public function test_a_guest_cannot_check_out(): void
    {
        $this->postJson('/api/checkout', ['address_id' => $this->address->id])->assertUnauthorized();
    }
}
