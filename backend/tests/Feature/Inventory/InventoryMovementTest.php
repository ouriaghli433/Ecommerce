<?php

namespace Tests\Feature\Inventory;

use App\Models\Inventory;
use App\Models\InventoryMovement;
use App\Models\Product;
use App\Services\InventoryService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class InventoryMovementTest extends TestCase
{
    use RefreshDatabase;

    public function test_purchase_increases_on_hand_and_records_movement(): void
    {
        // Arrange: create a product and its inventory.
        $product = Product::factory()->create();

        $inventory = Inventory::create([
            'product_id' => $product->id,
            'on_hand' => 10,
            'reserved' => 2,
        ]);

        // Act: record a purchase of 5 units.
        $movement = app(InventoryService::class)->recordMovement(
            inventory: $inventory,
            type: 'purchase',
            quantity: 5,
        );

        // Assert: inventory quantities are updated.
        $this->assertDatabaseHas('inventories', [
            'id' => $inventory->id,
            'on_hand' => 15,
            'reserved' => 2,
        ]);

        // Assert: the movement is recorded correctly.
        $this->assertInstanceOf(InventoryMovement::class, $movement);

        $this->assertDatabaseHas('inventory_movements', [
            'inventory_id' => $inventory->id,
            'movement_type' => 'purchase',
            'quantity' => 5,
        ]);
    }
    
    public function test_reservation_increases_reserved_without_changing_on_hand(): void
    {
        $product = Product::factory()->create();

        $inventory = Inventory::create([
            'product_id' => $product->id,
            'on_hand' => 10,
            'reserved' => 2,
        ]);

        $movement = app(InventoryService::class)->recordMovement(
            inventory: $inventory,
            type: 'reservation',
            quantity: 3,
        );

        $this->assertDatabaseHas('inventories', [
            'id' => $inventory->id,
            'on_hand' => 10,
            'reserved' => 5,
        ]);

        $this->assertDatabaseHas('inventory_movements', [
            'inventory_id' => $inventory->id,
            'movement_type' => 'reservation',
            'quantity' => 3,
        ]);
    }
    
    public function test_damage_decreases_on_hand_and_records_negative_quantity(): void
    {
        $product = Product::factory()->create();

        $inventory = Inventory::create([
            'product_id' => $product->id,
            'on_hand' => 10,
            'reserved' => 2,
        ]);

        app(InventoryService::class)->recordMovement(
            inventory: $inventory,
            type: 'damage',
            quantity: 3,
        );

        $this->assertDatabaseHas('inventories', [
            'id' => $inventory->id,
            'on_hand' => 7,
            'reserved' => 2,
        ]);

        $this->assertDatabaseHas('inventory_movements', [
            'inventory_id' => $inventory->id,
            'movement_type' => 'damage',
            'quantity' => -3,
        ]);
    }


}
