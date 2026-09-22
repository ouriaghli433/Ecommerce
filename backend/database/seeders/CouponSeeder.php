<?php

namespace Database\Seeders;

use App\Models\Coupon;
use Illuminate\Database\Seeder;

/**
 * One coupon per situation, so every rule (RG38, RG39) can be tried:
 * percent and fixed, with a minimum, with limits, expired, not started yet,
 * and one turned off.
 */
class CouponSeeder extends Seeder
{
    public function run(): void
    {
        $coupons = [
            [
                'code' => 'WELCOME10',
                'type' => 'percent',
                'value' => 10,
                'min_order_amount' => 20000,   // 200.00 MAD
                'per_user_limit' => 1,
            ],
            [
                'code' => 'SUMMER20',
                'type' => 'percent',
                'value' => 20,
                'min_order_amount' => 100000,  // 1000.00 MAD
                'max_usage' => 50,
            ],
            [
                'code' => 'SAVE50',
                'type' => 'fixed',
                'value' => 5000,               // 50.00 MAD off
                'min_order_amount' => 30000,
            ],
            [
                'code' => 'FREESHIP',
                'type' => 'fixed',
                'value' => 3000,               // the price of delivery
            ],
            [
                'code' => 'ONLYONE',
                'type' => 'percent',
                'value' => 15,
                'max_usage' => 1,              // the first customer takes it
            ],
            [
                'code' => 'LASTYEAR',
                'type' => 'percent',
                'value' => 25,
                'starts_at' => now()->subYear(),
                'expires_at' => now()->subMonths(6), // already finished
            ],
            [
                'code' => 'BLACKFRIDAY',
                'type' => 'percent',
                'value' => 30,
                'starts_at' => now()->addMonths(2), // not started yet
                'expires_at' => now()->addMonths(3),
            ],
            [
                'code' => 'PAUSED',
                'type' => 'fixed',
                'value' => 10000,
                'is_active' => false,
            ],
        ];

        foreach ($coupons as $coupon) {
            Coupon::firstOrCreate(['code' => $coupon['code']], $coupon);
        }

        $this->command->info('Coupons: '.Coupon::count());
    }
}
