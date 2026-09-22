<?php

namespace Database\Factories;

use App\Models\Inventory;
use App\Models\Product;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Inventory>
 */
class InventoryFactory extends Factory
{
    public function definition(): array
    {
        return [
            'product_id' => Product::factory(),
            'on_hand' => 10,
            'reserved' => 0,
        ];
    }
}
