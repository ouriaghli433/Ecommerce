<?php

namespace Tests\Feature\Category;

use App\Models\Category;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Foundation\Testing\WithFaker;
use Tests\TestCase;



class CategoryTest extends TestCase
{
    /**
     * A basic feature test example.
     */
    use RefreshDatabase;
    public function test_admin_can_list_categories(): void
    {
        $admin = User::factory()->create([
            'role' => 'admin',
        ]);

        Category::factory()->count(3)->create();

        $response = $this->actingAs($admin, 'sanctum')
            ->getJson('/api/category');

        $response->assertOk()
            ->assertJsonCount(3, 'categories');
    }
    public function test_admin_can_create_category(): void
    {
        $admin = User::factory()->create([
            'role' => 'admin',
        ]);

        $category = [
            'name' => fake()->words(1, true),
            'slug' => fake()->unique()->slug(),
            'description' => fake()->sentence(),
            'is_active' => true,
            'parent_id' => null,
        ];

        $response = $this->actingAs($admin, 'sanctum')
            ->postJson('/api/category', $category);

        $response->assertCreated();

        $this->assertDatabaseHas('categories', [
            'slug' => $category['slug'],
        ]);
    }
    public function test_admin_can_view_category():void 
    {
        $admin = User::factory()->create([
            'role' => 'admin'
        ]);
        $category = Category::factory()->create();
        $response = $this->actingAs($admin, 'sanctum')
            ->getJson("api/category/{$category->id}");

        $response->assertOk();
        
    }

    public function test_admin_can_update_category():void
    {
        $admin = User::factory()->create([
            'role' => 'admin'
        ]);

        $category = Category::factory()->create();

        $response = $this->actingAs($admin,'sanctum')->putJson("api/category/{$category->id}",[
            'name'=>'categ updated',
        ]);
        $this->assertDatabaseHas('categories',[
            'name' => 'categ updated'
        ]);
    }
    public function test_admin_can_delete_category():void
    {
        $admin = User::factory()->create([
            'role' => 'admin'
        ]);

        $category = Category::factory()->create();

        $response = $this->actingAs($admin,'sanctum')->deleteJson("/api/category/{$category->id}");
        $response->assertOK();
        $this->assertDatabaseMissing('categories',[
            'id' => $category->id,
        ]);
    }
    public function test_guest_can_view_categories():void
    {
        $response = $this->getJson("/api/category");
        $response->assertOk();        
    }
    public function test_guest_can_view_category():void
    {
        $category = Category::factory()->create();

        $response = $this->getJson("/api/category/{$category->id}");
        $response->assertOk();        
    }
    public function test_customer_cannot_create_category(): void
    {
        $customer = User::factory()->create([
            'role' => 'customer',
        ]);

        $category = [
            'name' => fake()->words(1, true),
            'slug' => fake()->unique()->slug(),
            'description' => fake()->sentence(),
            'is_active' => true,
            'parent_id' => null,
        ];

        $response = $this->actingAs($customer, 'sanctum')
            ->postJson('/api/category', $category);

        $response->assertForbidden();
    }
    public function test_customer_cannot_update_category(): void
    {
        $customer = User::factory()->create([
            'role' => 'customer',
        ]);

        $category = Category::factory()->create();


        $response = $this->actingAs($customer, 'sanctum')
            ->putJson("/api/category/{$category->id}", [
                'name' => 'nothing'
            ]);

        $response->assertForbidden();
    }
    public function test_customer_cannot_delete_category(): void
    {
        $customer = User::factory()->create([
            'role' => 'customer',
        ]);

        $category = Category::factory()->create();


        $response = $this->actingAs($customer, 'sanctum')
            ->deleteJson("/api/category/{$category->id}");

        $response->assertForbidden();
    }
        public function test_invalid_data_return_422(): void
    {
        $admin = User::factory()->create([
            'role' => 'admin',
        ]);

        $category = [
            'name' => true,
            'slug' => fake()->unique()->slug(),
            'description' => fake()->sentence(),
            'is_active' => true,
            'parent_id' => null,
        ];

        $response = $this->actingAs($admin, 'sanctum')
            ->postJson('/api/category', $category);

        $response->assertUnprocessable()->assertJsonValidationErrors(['name']);;
    }
}
