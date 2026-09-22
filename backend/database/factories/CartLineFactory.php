<?php

namespace Database\Factories;

use App\Models\Cart;
use App\Models\CartLine;
use App\Models\Product;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<CartLine>
 */
class CartLineFactory extends Factory
{
    public function definition(): array
    {
        return [
            'cart_id' => Cart::factory(),
            'product_id' => Product::factory(),
            'quantity' => 1,
            'unit_price' => 10000,
        ];
    }
}
