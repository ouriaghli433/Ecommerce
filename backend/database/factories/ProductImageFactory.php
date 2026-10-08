<?php

namespace Database\Factories;

use App\Models\Product;
use App\Models\ProductImage;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<ProductImage>
 */
class ProductImageFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'image_url' => fake()->imageUrl(),
            'alt_text' => fake()->sentence(3),
            'display_order' => fake()->numberBetween(0, 5),
            'is_primary' => false,
            'product_id' => Product::factory(),
        ];
    }
}
