<?php

namespace Database\Factories;

use App\Models\Coupon;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Coupon>
 */
class CouponFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'code' => fake()->unique()->bothify('COUPON-####'),
            'type' => fake()->randomElement(['percent', 'fixed']),
            'value' => fake()->numberBetween(5, 50),
            'min_order_amount' => fake()->numberBetween(100, 1000),
            'max_usage' => fake()->numberBetween(10, 100),
            'per_user_limit' => fake()->numberBetween(1, 3),
            'starts_at' => now(),
            'expires_at' => now()->addDays(30),
            'is_active' => true,
        ];
    }
}
