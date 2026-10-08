<?php

namespace Database\Factories;

use App\Models\Inventory;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\InventoryMovement>
 */
class InventoryMovementFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'movement_type' => fake()->randomElement([
                'purchase',
                'reservation',
                'release',
                'sale',
                'return',
                'damage',
                'adjustment',
            ]),
            'quantity' => fake()->numberBetween(1, 50),
            'reason' => fake()->sentence(),
            'reference_type' => null,
            'reference_id' => null,
            'inventory_id' => Inventory::factory(),
        ];
    }
}
