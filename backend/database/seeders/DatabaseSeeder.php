<?php

namespace Database\Seeders;

use App\Models\Address;
use App\Models\Cart;
use App\Models\CartLine;
use App\Models\Category;
use App\Models\Coupon;
use App\Models\Inventory;
use App\Models\InventoryMovement;
use App\Models\Order;
use App\Models\OrderLine;
use App\Models\Payment;
use App\Models\Product;
use App\Models\ProductImage;
use App\Models\Refund;
use App\Models\User;
// use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        User::factory()->count(10)->create();
        User::factory()->admin()->count(1)->create();
        $parent = Category::factory()->create();
        Category::factory()->child($parent)->count(5)->create();
        Product::factory()->count(10)->create();
        Cart::factory()->count(4)->create();
        CartLine::factory()->count(7)->create();
        Coupon::factory()->count(5)->create();
        Address::factory()->count(5)->create();
        Address::factory()->is_default()->count(2)->create();
        ProductImage::factory()->count(15)->create();
        Inventory::factory()->count(10)->create();
        InventoryMovement::factory()->count(15)->create();
        Order::factory()->count(5)->create();
        OrderLine::factory()->count(10)->create();
        Payment::factory()->count(5)->create();
        Refund::factory()->count(3)->create();
    }
}
