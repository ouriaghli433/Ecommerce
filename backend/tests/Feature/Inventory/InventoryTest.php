<?php

namespace Tests\Feature\Inventory;

use App\Models\Inventory;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class InventoryTest extends TestCase
{
    use RefreshDatabase;

    public function test_an_admin_can_view_stock(): void
    {
        $admin = User::factory()->admin()->create();
        $inventory = Inventory::factory()->create(['on_hand' => 10, 'reserved' => 4]);

        $this->actingAs($admin)->getJson("/api/products/{$inventory->product_id}/inventory")
            ->assertOk()
            ->assertJsonPath('data.on_hand', 10)
            ->assertJsonPath('data.reserved', 4)
            ->assertJsonPath('data.available', 6);
    }

    public function test_a_customer_cannot_view_stock(): void
    {
        $customer = User::factory()->create();
        $inventory = Inventory::factory()->create();

        $this->actingAs($customer)->getJson("/api/products/{$inventory->product_id}/inventory")
            ->assertForbidden();
    }

    public function test_a_purchase_adds_stock_and_records_a_movement(): void
    {
        $admin = User::factory()->admin()->create();
        $inventory = Inventory::factory()->create(['on_hand' => 10]);

        $this->actingAs($admin)->postJson("/api/products/{$inventory->product_id}/inventory/movements", [
            'type' => 'purchase',
            'quantity' => 5,
            'reason' => 'Supplier delivery',
        ])->assertCreated()
            ->assertJsonPath('movement.type', 'purchase')
            ->assertJsonPath('movement.quantity', 5)
            ->assertJsonPath('inventory.on_hand', 15);

        $this->assertDatabaseHas('inventory_movements', [
            'product_id' => $inventory->product_id,
            'type' => 'purchase',
            'quantity' => 5,
            'created_by' => $admin->id,
        ]);
    }

    public function test_damage_removes_stock(): void
    {
        $admin = User::factory()->admin()->create();
        $inventory = Inventory::factory()->create(['on_hand' => 10]);

        $this->actingAs($admin)->postJson("/api/products/{$inventory->product_id}/inventory/movements", [
            'type' => 'damage',
            'quantity' => -3,
        ])->assertCreated()->assertJsonPath('inventory.on_hand', 7);
    }

    public function test_stock_cannot_go_below_reserved(): void
    {
        $admin = User::factory()->admin()->create();
        $inventory = Inventory::factory()->create(['on_hand' => 10, 'reserved' => 8]);

        $this->actingAs($admin)->postJson("/api/products/{$inventory->product_id}/inventory/movements", [
            'type' => 'adjustment',
            'quantity' => -5,
        ])->assertUnprocessable()->assertJsonValidationErrors('quantity');

        $this->assertDatabaseHas('inventories', ['id' => $inventory->id, 'on_hand' => 10]);
        $this->assertDatabaseCount('inventory_movements', 0);
    }

    public function test_movement_input_is_validated(): void
    {
        $admin = User::factory()->admin()->create();
        $inventory = Inventory::factory()->create();
        $url = "/api/products/{$inventory->product_id}/inventory/movements";

        // sale is created by checkout only
        $this->actingAs($admin)->postJson($url, ['type' => 'sale', 'quantity' => 1])
            ->assertJsonValidationErrors('type');

        // a purchase must be positive, damage must be negative, never zero
        $this->actingAs($admin)->postJson($url, ['type' => 'purchase', 'quantity' => -1])
            ->assertJsonValidationErrors('quantity');
        $this->actingAs($admin)->postJson($url, ['type' => 'damage', 'quantity' => 2])
            ->assertJsonValidationErrors('quantity');
        $this->actingAs($admin)->postJson($url, ['type' => 'adjustment', 'quantity' => 0])
            ->assertJsonValidationErrors('quantity');
    }

    public function test_a_customer_cannot_add_a_movement(): void
    {
        $customer = User::factory()->create();
        $inventory = Inventory::factory()->create();

        $this->actingAs($customer)->postJson("/api/products/{$inventory->product_id}/inventory/movements", [
            'type' => 'purchase',
            'quantity' => 5,
        ])->assertForbidden();
    }

    public function test_an_admin_can_list_movements(): void
    {
        $admin = User::factory()->admin()->create();
        $inventory = Inventory::factory()->create();
        $url = "/api/products/{$inventory->product_id}/inventory/movements";

        $this->actingAs($admin)->postJson($url, ['type' => 'purchase', 'quantity' => 5]);
        $this->actingAs($admin)->postJson($url, ['type' => 'damage', 'quantity' => -1]);

        $this->actingAs($admin)->getJson($url)
            ->assertOk()
            ->assertJsonCount(2, 'data');
    }
}
