<?php

namespace Tests\Feature\Cart;

use App\Models\Cart;
use App\Models\CartLine;
use App\Models\Inventory;
use App\Models\Product;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CartTest extends TestCase
{
    use RefreshDatabase;

    private function productInStock(int $onHand = 10, int $price = 10000): Product
    {
        $product = Product::factory()->create(['price' => $price]);
        Inventory::factory()->create(['product_id' => $product->id, 'on_hand' => $onHand]);

        return $product;
    }

    public function test_the_cart_is_created_empty_on_first_visit(): void
    {
        $customer = User::factory()->create();

        $this->actingAs($customer)->getJson('/api/cart')
            ->assertOk()
            ->assertJsonPath('data.status', 'active')
            ->assertJsonCount(0, 'data.lines')
            ->assertJsonPath('data.subtotal', 0);

        $this->assertSame(1, $customer->carts()->count());
    }

    public function test_a_guest_has_no_cart(): void
    {
        $this->getJson('/api/cart')->assertUnauthorized();
    }

    public function test_a_customer_can_add_a_product(): void
    {
        $customer = User::factory()->create();
        $product = $this->productInStock(price: 25000);

        $this->actingAs($customer)->postJson('/api/cart/lines', [
            'product_id' => $product->id,
            'quantity' => 2,
        ])->assertOk()
            ->assertJsonPath('data.lines.0.product_id', $product->id)
            ->assertJsonPath('data.lines.0.quantity', 2)
            ->assertJsonPath('data.lines.0.unit_price', 25000)
            ->assertJsonPath('data.subtotal', 50000);
    }

    public function test_adding_the_same_product_again_increases_the_quantity(): void
    {
        $customer = User::factory()->create();
        $product = $this->productInStock();

        $this->actingAs($customer)->postJson('/api/cart/lines', ['product_id' => $product->id, 'quantity' => 1]);
        $this->actingAs($customer)->postJson('/api/cart/lines', ['product_id' => $product->id, 'quantity' => 2])
            ->assertOk()
            ->assertJsonCount(1, 'data.lines')
            ->assertJsonPath('data.lines.0.quantity', 3);
    }

    public function test_quantity_cannot_exceed_available_stock(): void
    {
        $customer = User::factory()->create();
        $product = $this->productInStock(onHand: 3);

        $this->actingAs($customer)->postJson('/api/cart/lines', ['product_id' => $product->id, 'quantity' => 4])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('quantity');
    }

    public function test_an_inactive_product_cannot_be_added(): void
    {
        $customer = User::factory()->create();
        $product = $this->productInStock();
        $product->update(['is_active' => false]);

        $this->actingAs($customer)->postJson('/api/cart/lines', ['product_id' => $product->id, 'quantity' => 1])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('product_id');
    }

    public function test_add_validates_input(): void
    {
        $customer = User::factory()->create();

        $this->actingAs($customer)->postJson('/api/cart/lines', ['product_id' => 'nope', 'quantity' => 0])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['product_id', 'quantity']);
    }

    public function test_a_customer_can_change_and_remove_a_line(): void
    {
        $customer = User::factory()->create();
        $cart = Cart::factory()->create(['user_id' => $customer->id]);
        $line = CartLine::factory()->create(['cart_id' => $cart->id, 'product_id' => $this->productInStock()->id]);

        $this->actingAs($customer)->patchJson("/api/cart/lines/{$line->id}", ['quantity' => 5])
            ->assertOk()
            ->assertJsonPath('data.lines.0.quantity', 5);

        $this->actingAs($customer)->deleteJson("/api/cart/lines/{$line->id}")
            ->assertOk()
            ->assertJsonCount(0, 'data.lines');
    }

    public function test_a_customer_cannot_touch_another_customers_cart_line(): void
    {
        $customer = User::factory()->create();
        $line = CartLine::factory()->create();

        $this->actingAs($customer)->patchJson("/api/cart/lines/{$line->id}", ['quantity' => 2])->assertForbidden();
        $this->actingAs($customer)->deleteJson("/api/cart/lines/{$line->id}")->assertForbidden();
    }

    public function test_a_customer_can_clear_the_cart(): void
    {
        $customer = User::factory()->create();
        $cart = Cart::factory()->create(['user_id' => $customer->id]);
        CartLine::factory()->count(2)->create(['cart_id' => $cart->id]);

        $this->actingAs($customer)->deleteJson('/api/cart')
            ->assertOk()
            ->assertJsonCount(0, 'data.lines');
    }
}
