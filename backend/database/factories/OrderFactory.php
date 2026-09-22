<?php

namespace Database\Factories;

use App\Models\Order;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Order>
 */
class OrderFactory extends Factory
{
    public function definition(): array
    {
        return [
            'user_id' => User::factory(),
            'status' => 'pending_payment',
            'subtotal' => 20000,
            'discount_amount' => 0,
            'shipping_amount' => 0,
            'tax_amount' => 0,
            'total_amount' => 20000,
            'currency' => 'MAD',
            'expires_at' => now()->addMinutes(20),
            'shipping_full_name' => fake()->name(),
            'shipping_phone' => '0612345678',
            'shipping_address_line' => fake()->streetAddress(),
            'shipping_city' => fake()->city(),
            'shipping_postal_code' => fake()->postcode(),
            'shipping_country' => 'MA',
        ];
    }

    public function status(string $status): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => $status,
        ]);
    }
}
