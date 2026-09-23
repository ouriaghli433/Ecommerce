<?php

namespace Tests\Feature\Catalog;

use App\Models\Product;
use App\Models\ProductImage;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ProductImageManagementTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;

    private Product $product;

    protected function setUp(): void
    {
        parent::setUp();

        $this->admin = User::factory()->admin()->create();
        $this->product = Product::factory()->create(['name' => 'Desk lamp']);
    }

    public function test_the_first_picture_becomes_the_main_one(): void
    {
        $this->actingAs($this->admin)
            ->postJson("/api/products/{$this->product->id}/images", [
                'url' => 'https://example.com/lamp-1.jpg',
            ])
            ->assertCreated()
            ->assertJsonPath('data.is_primary', true)
            ->assertJsonPath('data.alt_text', 'Desk lamp'); // falls back to the product name
    }

    public function test_more_pictures_are_added_after_the_first(): void
    {
        $url = "/api/products/{$this->product->id}/images";

        $this->actingAs($this->admin)->postJson($url, ['url' => 'https://example.com/1.jpg']);
        $this->actingAs($this->admin)->postJson($url, ['url' => 'https://example.com/2.jpg'])
            ->assertCreated()
            ->assertJsonPath('data.is_primary', false)
            ->assertJsonPath('data.display_order', 1);

        $this->actingAs($this->admin)->getJson($url)->assertOk()->assertJsonCount(2, 'data');
    }

    public function test_choosing_a_new_main_picture_replaces_the_old_one(): void
    {
        $first = ProductImage::factory()->primary()->create(['product_id' => $this->product->id]);
        $second = ProductImage::factory()->create(['product_id' => $this->product->id]);

        $this->actingAs($this->admin)
            ->patchJson("/api/products/{$this->product->id}/images/{$second->id}", [
                'is_primary' => true,
            ])
            ->assertOk()
            ->assertJsonPath('data.is_primary', true);

        $this->assertFalse($first->fresh()->is_primary);
    }

    public function test_deleting_the_main_picture_promotes_the_next_one(): void
    {
        $main = ProductImage::factory()->primary()->create(['product_id' => $this->product->id]);
        $second = ProductImage::factory()->create([
            'product_id' => $this->product->id,
            'display_order' => 1,
        ]);

        $this->actingAs($this->admin)
            ->deleteJson("/api/products/{$this->product->id}/images/{$main->id}")
            ->assertNoContent();

        $this->assertTrue($second->fresh()->is_primary);
        $this->assertDatabaseCount('product_images', 1);
    }

    public function test_the_picture_address_is_checked(): void
    {
        $this->actingAs($this->admin)
            ->postJson("/api/products/{$this->product->id}/images", ['url' => 'not-a-link'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('url');
    }

    public function test_a_picture_of_another_product_cannot_be_touched(): void
    {
        $otherProduct = Product::factory()->create();
        $image = ProductImage::factory()->create(['product_id' => $otherProduct->id]);

        $this->actingAs($this->admin)
            ->deleteJson("/api/products/{$this->product->id}/images/{$image->id}")
            ->assertNotFound();
    }

    public function test_a_customer_cannot_manage_pictures(): void
    {
        $customer = User::factory()->create();

        $this->actingAs($customer)
            ->postJson("/api/products/{$this->product->id}/images", [
                'url' => 'https://example.com/1.jpg',
            ])
            ->assertForbidden();
    }
}
