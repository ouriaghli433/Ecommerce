<?php

namespace Database\Factories;

use App\Models\Address;
use App\Models\Coupon;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Order>
 */
class OrderFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'status' => 'pending_payment',
            'subtotal' => fake()->numberBetween(1000, 100000),
            'discount_amount' => 0,
            'shipping_amount' => fake()->numberBetween(0, 5000),
            'tax_amount' => 0,
            'total_amount' => fake()->numberBetween(1000, 100000),
            'currency' => 'MAD',
            'expires_at' => now()->addHours(1),
            'paid_at' => null,
            'cancelled_at' => null,
            'cancel_reason' => null,

            'shipping_full_name' => fake()->name(),
            'shipping_phone' => fake()->phoneNumber(),
            'shipping_address_line' => fake()->address(),
            'shipping_city' => fake()->city(),
            'shipping_postal_code' => fake()->postcode(),
            'shipping_country' => 'Morocco',

            'user_id' => User::factory(),
            'coupon_id' => Coupon::factory(),
            'shipping_address_id' => Address::factory(),
        ];
    }
}
