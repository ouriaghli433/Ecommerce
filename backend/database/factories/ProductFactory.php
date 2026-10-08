<?php

namespace Database\Factories;

use App\Models\Category;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Product>
 */
class ProductFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'name' => fake()->words(3, true),
            'slug' => fake()->unique()->slug(),
            'sku' => fake()->unique()->bothify('SKU-####??'),
            'price' => fake()->numberBetween(100, 100000),
            'description' => fake()->sentence(),
            'is_active' => true,
            'attributes' => [
                'color' => fake()->safeColorName(),
                'size' => fake()->randomElement(['S', 'M', 'L', 'XL']),
            ],
            'category_id' => Category::factory(),
        ];
    }
}
