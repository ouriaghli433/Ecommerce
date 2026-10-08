<?php

namespace Database\Factories;

use App\Models\Payment;
use App\Models\Refund;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Refund>
 */
class RefundFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'amount' => fake()->numberBetween(1000, 100000),
            'status' => fake()->randomElement([
                'pending',
                'succeeded',
                'failed',
            ]),
            'reason' => fake()->randomElement([
                'late_payment',
                'order_cancelled',
                'customer_request',
                'admin',
            ]),
            'provider_ref' => null,
            'payment_id' => Payment::factory(),
            'created_by' => null,
        ];
    }
}
