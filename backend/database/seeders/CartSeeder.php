<?php

namespace Database\Seeders;

use App\Models\Cart;
use App\Models\Inventory;
use App\Models\Product;
use App\Models\User;
use Illuminate\Database\Seeder;

/**
 * A few customers are left with something in their cart, so the shop has
 * carts that were never checked out (RG13: one active cart each).
 */
class CartSeeder extends Seeder
{
    public function run(): void
    {
        $customers = User::where('role', 'customer')->inRandomOrder()->take(6)->get();

        foreach ($customers as $customer) {
            $cart = Cart::firstOrCreate(['user_id' => $customer->id, 'status' => 'active']);

            if ($cart->lines()->exists()) {
                continue;
            }

            $products = Product::where('is_active', true)->inRandomOrder()->take(random_int(1, 3))->get();

            foreach ($products as $product) {
                $inventory = Inventory::where('product_id', $product->id)->first();
                $available = $inventory ? $inventory->on_hand - $inventory->reserved : 0;

                if ($available < 1) {
                    continue;
                }

                $cart->lines()->create([
                    'product_id' => $product->id,
                    'quantity' => min($available, random_int(1, 2)),
                    'unit_price' => $product->price,
                ]);
            }
        }

        $this->command->info('Active carts with items: '.Cart::where('status', 'active')->has('lines')->count());
    }
}
