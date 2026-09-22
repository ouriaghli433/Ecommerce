<?php

namespace Tests\Feature\Catalog;

use App\Models\Category;
use App\Models\Inventory;
use App\Models\Product;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class CatalogCacheTest extends TestCase
{
    use RefreshDatabase;

    /** Counts the SQL queries made while running $callback. */
    private function countQueries(callable $callback): int
    {
        $count = 0;
        DB::listen(function () use (&$count) {
            $count++;
        });

        $callback();

        return $count;
    }

    public function test_the_product_list_is_served_from_the_cache_the_second_time(): void
    {
        Product::factory()->count(3)->create();

        $first = $this->countQueries(fn () => $this->getJson('/api/products')->assertOk());
        $second = $this->countQueries(fn () => $this->getJson('/api/products')->assertOk());

        $this->assertGreaterThan(0, $first);
        $this->assertSame(0, $second, 'The second call should not touch the database.');
    }

    public function test_the_category_list_is_cached_too(): void
    {
        Category::factory()->count(2)->create();

        $this->getJson('/api/categories')->assertOk()->assertJsonCount(2, 'data');

        $second = $this->countQueries(fn () => $this->getJson('/api/categories')->assertOk());

        $this->assertSame(0, $second);
    }

    public function test_admins_and_guests_do_not_share_a_cached_list(): void
    {
        Product::factory()->create();
        Product::factory()->inactive()->create();
        $admin = User::factory()->admin()->create();

        $this->getJson('/api/products')->assertJsonCount(1, 'data');
        $this->actingAs($admin)->getJson('/api/products')->assertJsonCount(2, 'data');
    }

    public function test_filters_and_pages_have_their_own_cache_entry(): void
    {
        $phones = Category::factory()->create();
        Product::factory()->create(['name' => 'iPhone 15', 'category_id' => $phones->id]);
        Product::factory()->create(['name' => 'Laptop bag']);

        $this->getJson('/api/products')->assertJsonCount(2, 'data');
        $this->getJson("/api/products?category_id={$phones->id}")->assertJsonCount(1, 'data');
        $this->getJson('/api/products?search=laptop')->assertJsonCount(1, 'data');
    }

    public function test_creating_a_product_clears_the_cached_lists(): void
    {
        $admin = User::factory()->admin()->create();
        $category = Category::factory()->create();
        Product::factory()->create();

        $this->getJson('/api/products')->assertJsonCount(1, 'data');

        $this->actingAs($admin)->postJson('/api/products', [
            'name' => 'New product',
            'slug' => 'new-product',
            'sku' => 'NEW-1',
            'price' => 1000,
            'category_id' => $category->id,
        ])->assertCreated();

        $this->getJson('/api/products')->assertJsonCount(2, 'data');
    }

    public function test_updating_a_product_clears_the_cached_lists(): void
    {
        $admin = User::factory()->admin()->create();
        $product = Product::factory()->create(['price' => 1000]);

        $this->getJson('/api/products')->assertJsonPath('data.0.price', 1000);

        $this->actingAs($admin)->patchJson("/api/products/{$product->id}", ['price' => 2000])->assertOk();

        $this->getJson('/api/products')->assertJsonPath('data.0.price', 2000);
    }

    public function test_updating_a_category_clears_the_cached_lists(): void
    {
        $admin = User::factory()->admin()->create();
        $category = Category::factory()->create(['name' => 'Old name']);

        $this->getJson('/api/categories')->assertJsonPath('data.0.name', 'Old name');

        $this->actingAs($admin)->patchJson("/api/categories/{$category->id}", ['name' => 'New name'])->assertOk();

        $this->getJson('/api/categories')->assertJsonPath('data.0.name', 'New name');
    }

    public function test_stock_is_never_served_from_the_cache(): void
    {
        $product = Product::factory()->create();
        $inventory = Inventory::factory()->create(['product_id' => $product->id, 'on_hand' => 10, 'reserved' => 0]);

        // the listing carries no stock at all
        $this->getJson('/api/products')->assertOk()->assertJsonMissingPath('data.0.available_stock');

        $this->getJson("/api/products/{$product->id}")->assertJsonPath('data.available_stock', 10);

        // stock changes without any cache flush
        $inventory->update(['reserved' => 4]);

        $this->getJson("/api/products/{$product->id}")->assertJsonPath('data.available_stock', 6);
    }
}
