<?php

namespace Database\Factories;

use App\Models\Category;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Category>
 */
class CategoryFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'name' => fake()->words(1,true),
            'slug'=> fake()->unique()->slug(),
            'description' => fake()->sentence(),
            'is_active' => true,
            'parent_id' => null
        ];
    }
    public function child(Category $parent): static
    {
        return $this->state(fn () => [
        'parent_id' => $parent->id,
        ]);
    }
}
