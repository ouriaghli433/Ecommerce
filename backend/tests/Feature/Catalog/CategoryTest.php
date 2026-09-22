<?php

namespace Tests\Feature\Catalog;

use App\Models\Category;
use App\Models\Product;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CategoryTest extends TestCase
{
    use RefreshDatabase;

    public function test_guests_see_only_active_categories(): void
    {
        Category::factory()->count(2)->create();
        Category::factory()->inactive()->create();

        $this->getJson('/api/categories')
            ->assertOk()
            ->assertJsonCount(2, 'data');
    }

    public function test_admins_also_see_inactive_categories(): void
    {
        $admin = User::factory()->admin()->create();
        Category::factory()->count(2)->create();
        Category::factory()->inactive()->create();

        $this->actingAs($admin)->getJson('/api/categories')
            ->assertOk()
            ->assertJsonCount(3, 'data');
    }

    public function test_show_returns_parent_and_children(): void
    {
        $parent = Category::factory()->create();
        $child = Category::factory()->create(['parent_id' => $parent->id]);

        $this->getJson("/api/categories/{$parent->id}")
            ->assertOk()
            ->assertJsonPath('data.id', $parent->id)
            ->assertJsonPath('data.children.0.id', $child->id);
    }

    public function test_an_inactive_category_is_hidden_from_guests(): void
    {
        $category = Category::factory()->inactive()->create();

        $this->getJson("/api/categories/{$category->id}")->assertNotFound();
    }

    public function test_an_admin_can_create_a_category(): void
    {
        $admin = User::factory()->admin()->create();

        $this->actingAs($admin)->postJson('/api/categories', [
            'name' => 'Phones',
            'slug' => 'phones',
        ])->assertCreated()->assertJsonPath('data.slug', 'phones');

        $this->assertDatabaseHas('categories', ['slug' => 'phones']);
    }

    public function test_create_validates_input(): void
    {
        $admin = User::factory()->admin()->create();
        Category::factory()->create(['slug' => 'phones']);

        $this->actingAs($admin)->postJson('/api/categories', [
            'slug' => 'phones',
            'parent_id' => 'not-a-uuid',
        ])->assertUnprocessable()
            ->assertJsonValidationErrors(['name', 'slug', 'parent_id']);
    }

    public function test_a_customer_cannot_create_a_category(): void
    {
        $customer = User::factory()->create();

        $this->actingAs($customer)->postJson('/api/categories', [
            'name' => 'Phones',
            'slug' => 'phones',
        ])->assertForbidden();
    }

    public function test_a_guest_cannot_create_a_category(): void
    {
        $this->postJson('/api/categories', ['name' => 'Phones', 'slug' => 'phones'])
            ->assertUnauthorized();
    }

    public function test_an_admin_can_update_a_category(): void
    {
        $admin = User::factory()->admin()->create();
        $category = Category::factory()->create();

        $this->actingAs($admin)->patchJson("/api/categories/{$category->id}", ['name' => 'New name'])
            ->assertOk()
            ->assertJsonPath('data.name', 'New name');
    }

    public function test_a_category_cannot_be_its_own_parent(): void
    {
        $admin = User::factory()->admin()->create();
        $category = Category::factory()->create();

        $this->actingAs($admin)->patchJson("/api/categories/{$category->id}", ['parent_id' => $category->id])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('parent_id');
    }

    public function test_an_admin_can_delete_an_empty_category(): void
    {
        $admin = User::factory()->admin()->create();
        $category = Category::factory()->create();

        $this->actingAs($admin)->deleteJson("/api/categories/{$category->id}")->assertNoContent();

        $this->assertDatabaseMissing('categories', ['id' => $category->id]);
    }

    public function test_a_category_with_products_cannot_be_deleted(): void
    {
        $admin = User::factory()->admin()->create();
        $product = Product::factory()->create();

        $this->actingAs($admin)->deleteJson("/api/categories/{$product->category_id}")->assertUnprocessable();

        $this->assertDatabaseHas('categories', ['id' => $product->category_id]);
    }
}
