<?php

namespace Database\Factories;

use App\Models\Order;
use App\Models\Payment;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Payment>
 */
class PaymentFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'status' => fake()->randomElement([
                'pending',
                'processing',
                'succeeded',
                'failed',
            ]),
            'amount' => fake()->numberBetween(1000, 100000),
            'currency' => 'MAD',
            'provider' => fake()->randomElement(['stripe', 'paypal']),
            'provider_ref' => fake()->unique()->uuid(),
            'failure_reason' => null,
            'succeeded_at' => null,
            'order_id' => Order::factory(),
        ];
    }
}
