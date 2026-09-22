<?php

namespace Tests\Feature\Catalog;

use App\Models\Category;
use App\Models\Inventory;
use App\Models\Product;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ProductTest extends TestCase
{
    use RefreshDatabase;

    public function test_guests_see_only_active_products(): void
    {
        Product::factory()->count(2)->create();
        Product::factory()->inactive()->create();

        $this->getJson('/api/products')
            ->assertOk()
            ->assertJsonCount(2, 'data')
            ->assertJsonStructure(['data', 'links', 'meta']);
    }

    public function test_products_can_be_filtered_by_category_and_search(): void
    {
        $phones = Category::factory()->create();
        Product::factory()->create(['name' => 'iPhone 15', 'category_id' => $phones->id]);
        Product::factory()->create(['name' => 'Galaxy S24', 'category_id' => $phones->id]);
        Product::factory()->create(['name' => 'iPhone case']);

        $this->getJson("/api/products?category_id={$phones->id}")->assertJsonCount(2, 'data');
        $this->getJson('/api/products?search=iphone')->assertJsonCount(2, 'data');
    }

    public function test_show_returns_the_product_with_its_stock(): void
    {
        $inventory = Inventory::factory()->create(['on_hand' => 10, 'reserved' => 3]);

        $this->getJson("/api/products/{$inventory->product_id}")
            ->assertOk()
            ->assertJsonPath('data.id', $inventory->product_id)
            ->assertJsonPath('data.available_stock', 7);
    }

    public function test_an_inactive_product_is_hidden_from_guests(): void
    {
        $product = Product::factory()->inactive()->create();

        $this->getJson("/api/products/{$product->id}")->assertNotFound();
    }

    public function test_an_admin_token_can_see_an_inactive_product(): void
    {
        $token = User::factory()->admin()->create()->createToken('api')->plainTextToken;
        $product = Product::factory()->inactive()->create();

        $this->withToken($token)->getJson("/api/products/{$product->id}")->assertOk();
    }

    public function test_an_admin_can_create_a_product_with_an_empty_inventory(): void
    {
        $admin = User::factory()->admin()->create();
        $category = Category::factory()->create();

        $response = $this->actingAs($admin)->postJson('/api/products', [
            'name' => 'iPhone 15',
            'slug' => 'iphone-15',
            'sku' => 'IPH-15',
            'price' => 1199900,
            'category_id' => $category->id,
            'attributes' => ['storage' => '128GB'],
        ]);

        $response->assertCreated()
            ->assertJsonPath('data.sku', 'IPH-15')
            ->assertJsonPath('data.attributes.storage', '128GB')
            ->assertJsonPath('data.available_stock', 0);

        $this->assertDatabaseHas('inventories', [
            'product_id' => $response->json('data.id'),
            'on_hand' => 0,
            'reserved' => 0,
        ]);
    }

    public function test_create_validates_input(): void
    {
        $admin = User::factory()->admin()->create();
        $existing = Product::factory()->create();

        $this->actingAs($admin)->postJson('/api/products', [
            'sku' => $existing->sku,
            'price' => -5,
            'category_id' => 'not-a-uuid',
        ])->assertUnprocessable()
            ->assertJsonValidationErrors(['name', 'slug', 'sku', 'price', 'category_id']);
    }

    public function test_a_customer_cannot_create_a_product(): void
    {
        $customer = User::factory()->create();

        $this->actingAs($customer)->postJson('/api/products', [])->assertForbidden();
    }

    public function test_an_admin_can_update_a_product(): void
    {
        $admin = User::factory()->admin()->create();
        $product = Product::factory()->create();

        $this->actingAs($admin)->patchJson("/api/products/{$product->id}", [
            'price' => 5000,
            'is_active' => false,
        ])->assertOk()
            ->assertJsonPath('data.price', 5000)
            ->assertJsonPath('data.is_active', false);
    }

    public function test_an_admin_can_delete_a_product_without_history(): void
    {
        $admin = User::factory()->admin()->create();
        $inventory = Inventory::factory()->create();

        $this->actingAs($admin)->deleteJson("/api/products/{$inventory->product_id}")->assertNoContent();

        $this->assertDatabaseMissing('products', ['id' => $inventory->product_id]);
        $this->assertDatabaseMissing('inventories', ['id' => $inventory->id]);
    }

    public function test_a_customer_cannot_delete_a_product(): void
    {
        $customer = User::factory()->create();
        $product = Product::factory()->create();

        $this->actingAs($customer)->deleteJson("/api/products/{$product->id}")->assertForbidden();
    }
}
