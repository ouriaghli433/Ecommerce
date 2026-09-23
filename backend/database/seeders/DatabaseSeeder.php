<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

/**
 * Demo data for development. The order below matters: products need
 * categories, addresses need customers, and orders need all of them.
 *
 *   php artisan db:seed
 *   php artisan migrate:fresh --seed     (empties the database first)
 *
 * Log in with admin@example.com or customer@example.com, password "password".
 */
class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $this->call([
            UserSeeder::class,
            CategorySeeder::class,
            ProductSeeder::class,
            ProductImageSeeder::class,
            CouponSeeder::class,
            AddressSeeder::class,
            OrderSeeder::class,   // uses the real checkout and payment services
            CartSeeder::class,    // leaves a few carts open, after the orders
        ]);

        $this->command->newLine();
        $this->command->info('Accounts: admin@example.com / manager@example.com / customer@example.com');
        $this->command->info('Password: password');
    }
}
