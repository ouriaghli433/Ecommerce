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
    public function definition(): array
    {
        return [
            'payment_id' => Payment::factory()->succeeded(),
            'amount' => 5000,
            'status' => 'pending',
            'reason' => 'customer_request',
        ];
    }
}
