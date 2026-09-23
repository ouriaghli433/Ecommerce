<?php

namespace Tests\Feature\Catalog;

use App\Models\Inventory;
use App\Models\Product;
use App\Models\ProductImage;
use App\Models\User;
use Illuminate\Database\QueryException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ProductImageTest extends TestCase
{
    use RefreshDatabase;

    public function test_the_product_page_returns_the_gallery_in_order(): void
    {
        $product = Product::factory()->create();

        ProductImage::factory()->create([
            'product_id' => $product->id,
            'url' => 'https://example.com/second.jpg',
            'display_order' => 2,
        ]);
        ProductImage::factory()->primary()->create([
            'product_id' => $product->id,
            'url' => 'https://example.com/main.jpg',
            'alt_text' => 'The main picture',
        ]);

        $this->getJson("/api/products/{$product->id}")
            ->assertOk()
            ->assertJsonCount(2, 'data.images')
            ->assertJsonPath('data.images.0.url', 'https://example.com/main.jpg')
            ->assertJsonPath('data.images.0.is_primary', true)
            ->assertJsonPath('data.images.0.alt_text', 'The main picture')
            ->assertJsonPath('data.images.1.url', 'https://example.com/second.jpg')
            ->assertJsonPath('data.primary_image_url', 'https://example.com/main.jpg');
    }

    public function test_the_listing_carries_only_the_main_picture(): void
    {
        $product = Product::factory()->create();
        ProductImage::factory()->primary()->create([
            'product_id' => $product->id,
            'url' => 'https://example.com/main.jpg',
        ]);
        ProductImage::factory()->count(2)->create(['product_id' => $product->id]);

        $this->getJson('/api/products')
            ->assertOk()
            ->assertJsonPath('data.0.primary_image_url', 'https://example.com/main.jpg')
            ->assertJsonMissingPath('data.0.images');
    }

    public function test_a_product_without_pictures_still_works(): void
    {
        $product = Product::factory()->create();

        $this->getJson("/api/products/{$product->id}")
            ->assertOk()
            ->assertJsonPath('data.primary_image_url', null)
            ->assertJsonCount(0, 'data.images');
    }

    public function test_the_cart_shows_the_product_picture(): void
    {
        $customer = User::factory()->create();
        $product = Product::factory()->create();
        Inventory::factory()->create(['product_id' => $product->id, 'on_hand' => 5]);
        ProductImage::factory()->primary()->create([
            'product_id' => $product->id,
            'url' => 'https://example.com/cart.jpg',
        ]);

        $this->actingAs($customer)
            ->postJson('/api/cart/lines', ['product_id' => $product->id, 'quantity' => 1])
            ->assertOk()
            ->assertJsonPath('data.lines.0.product.primary_image_url', 'https://example.com/cart.jpg');
    }

    public function test_only_one_picture_can_be_the_main_one(): void
    {
        $product = Product::factory()->create();
        ProductImage::factory()->primary()->create(['product_id' => $product->id]);

        // The database refuses a second main picture for the same product.
        $this->expectException(QueryException::class);

        ProductImage::factory()->primary()->create(['product_id' => $product->id]);
    }

    public function test_deleting_a_product_deletes_its_pictures(): void
    {
        $admin = User::factory()->admin()->create();
        $inventory = Inventory::factory()->create();
        $product = $inventory->product;
        ProductImage::factory()->count(3)->create(['product_id' => $product->id]);

        $this->actingAs($admin)->deleteJson("/api/products/{$product->id}")->assertNoContent();

        $this->assertDatabaseCount('product_images', 0);
    }
}
