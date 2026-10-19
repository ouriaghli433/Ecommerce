<?php

namespace Tests\Feature\Product;

use App\Models\Category;
use App\Models\Product;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Foundation\Testing\WithFaker;
use Tests\TestCase;

class ProductTests extends TestCase
{
    /**
     * A basic feature test example.
     */
    use RefreshDatabase;
    public function test_admin_can_create_product(): void
    {
        $admin = User::factory()->create([
            'role' => 'admin'
        ]);
        $category = Category::factory()->create();
        $product = [
            'name' => fake()->words(3, true),
            'slug' => fake()->unique()->slug(),
            'sku' => fake()->unique()->bothify('SKU-####??'),
            'price' => fake()->numberBetween(100, 100000),
            'description' => fake()->sentence(),
            'is_active' => true,
            'attributes' => json_encode([
                'color' => fake()->safeColorName(),
                'size' => fake()->randomElement(['S', 'M', 'L', 'XL']),
            ]),
            'category_id' => $category->id,
        ];
        $response = $this->actingAs($admin, 'sanctum')
            ->postJson("/api/product", $product);
        $response->assertCreated();
    }
    public function test_admin_can_update_product(): void
    {
        $admin = User::factory()->create([
            'role' => 'admin'
        ]);
        $category = Category::factory()->create();
        $pr = Product::factory()->create([
            'category_id' => $category->id,
        ]);
        $product = [
            'name' => 'Updated product',
            'slug' => fake()->unique()->slug(),
            'sku' => 'update-sku',
            'price' => fake()->numberBetween(100, 100000),
            'description' => fake()->sentence(),
            'is_active' => true,
            'attributes' => json_encode([
                'color' => fake()->safeColorName(),
                'size' => fake()->randomElement(['S', 'M', 'L', 'XL']),
            ]),
            'category_id' => $category->id,
        ];
        $response = $this->actingAs($admin, 'sanctum')
            ->putJson("/api/product/$pr->id", $product);
        $response->assertOk();
        $this->assertDatabaseHas('products',[
            'id' => $pr->id,
            'name' => 'Updated product',
            'sku' => 'update-sku',
        ]);
    }
    public function test_admin_can_delete_product():void {
        $admin = User::factory()->create([
            'role' => 'admin'
        ]);

        $product = Product::factory()->create();

        $response =  $this->actingAs($admin, 'sanctum')
            ->delete("/api/product/$product->id");
        $response->assertOk();
        $this->assertDatabaseMissing('products',[
            'id' => $product->id
        ]);
    }
    public function test_guest_can_view_products(): void{
        $products = Product::factory()->count(5)->create();

        $response = $this->getJson("/api/product");
        $response->assertOk()->assertJsonCount(5,'products');
        $this->assertDatabaseCount('products', 5);
    }
    public function test_guest_can_view_a_single_product(): void
    {
        $product = Product::factory()->create();

        $response = $this->getJson("/api/product/{$product->id}");

        $response->assertOk()
            ->assertJsonPath('product.id', $product->id);
    }
    public function test_viewnig_nonexistent_product_return_404(): void
    {
        $response = $this->getJson("/api/product/" . \Illuminate\Support\Str::uuid());
        $response->assertNotFound();
    }
    public function test_guest_cannot_create_product(): void
    {
        $category = Category::factory()->create();

        $product = [
            'name' => 'Gaming Laptop',
            'slug' => fake()->unique()->slug(),
            'sku' => fake()->unique()->bothify('SKU-####??'),
            'price' => 12000,
            'is_active' => true,
            'category_id' => $category->id,
        ];

        $response = $this->postJson('/api/product', $product);
        $response->assertUnauthorized();
    }
}
