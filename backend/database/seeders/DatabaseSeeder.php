<?php

namespace Database\Seeders;

use App\Models\Category;
use App\Models\Coupon;
use App\Models\Inventory;
use App\Models\Product;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

/**
 * Demo data for development only: two accounts, a small catalogue with real
 * stock, and one coupon. It creates rows through the normal models and
 * changes no business rule.
 *
 *   php artisan db:seed
 *   php artisan migrate:fresh --seed
 */
class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $admin = User::firstOrCreate(
            ['email' => 'admin@example.com'],
            [
                'first_name' => 'Amine',
                'last_name' => 'Admin',
                'password' => Hash::make('password'),
            ],
        );

        // role is not mass assignable on purpose (RG1), so it is set here.
        $admin->forceFill(['role' => 'admin'])->save();

        User::firstOrCreate(
            ['email' => 'customer@example.com'],
            [
                'first_name' => 'Sara',
                'last_name' => 'Client',
                'password' => Hash::make('password'),
            ],
        );

        $catalogue = [
            'Phones' => [
                ['iPhone 15', 'IPH-15', 1199900, ['storage' => '128GB', 'color' => 'Black']],
                ['Galaxy S24', 'SAM-S24', 999900, ['storage' => '256GB', 'color' => 'Grey']],
            ],
            'Audio' => [
                ['Wireless headphones', 'AUD-WH1', 149900, ['battery' => '30h']],
                ['Compact speaker', 'AUD-SP2', 79900, ['battery' => '12h']],
            ],
            'Accessories' => [
                ['Leather phone case', 'ACC-CASE', 24900, ['material' => 'Leather']],
                ['Fast charger 65W', 'ACC-CHG', 39900, ['power' => '65W']],
                ['Braided USB-C cable', 'ACC-CBL', 12900, ['length' => '2m']],
            ],
            'Home' => [
                ['Desk lamp', 'HOM-LAMP', 44900, ['color' => 'Sage']],
                ['Ceramic mug', 'HOM-MUG', 9900, ['volume' => '350ml']],
            ],
        ];

        foreach ($catalogue as $categoryName => $products) {
            $category = Category::firstOrCreate(
                ['slug' => str($categoryName)->slug()->value()],
                ['name' => $categoryName, 'is_active' => true],
            );

            foreach ($products as [$name, $sku, $price, $attributes]) {
                $product = Product::firstOrCreate(
                    ['sku' => $sku],
                    [
                        'name' => $name,
                        'slug' => str($name)->slug()->value(),
                        'description' => "{$name} — part of our {$categoryName} selection.",
                        'price' => $price,
                        'is_active' => true,
                        'attributes' => $attributes,
                        'category_id' => $category->id,
                    ],
                );

                Inventory::firstOrCreate(
                    ['product_id' => $product->id],
                    ['on_hand' => 25, 'reserved' => 0],
                );
            }
        }

        Coupon::firstOrCreate(
            ['code' => 'WELCOME10'],
            [
                'type' => 'percent',
                'value' => 10,
                'min_order_amount' => 20000,
                'is_active' => true,
            ],
        );

        $this->command->info('Demo data ready: admin@example.com / customer@example.com (password)');
    }
}
