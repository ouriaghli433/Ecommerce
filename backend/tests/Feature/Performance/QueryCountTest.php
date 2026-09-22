<?php

namespace Tests\Feature\Performance;

use App\Models\Inventory;
use App\Models\Notification;
use App\Models\Order;
use App\Models\OrderLine;
use App\Models\Product;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

/**
 * "N+1" means: one query for the list, then one more for every row. With 50
 * orders that is 51 queries instead of 2. These tests make sure the number of
 * queries does not grow with the number of rows.
 */
class QueryCountTest extends TestCase
{
    use RefreshDatabase;

    private function countQueries(callable $callback): int
    {
        $count = 0;
        DB::listen(function () use (&$count) {
            $count++;
        });

        $callback();

        return $count;
    }

    private function ordersFor(User $customer, int $count): void
    {
        for ($i = 0; $i < $count; $i++) {
            $order = Order::factory()->create(['user_id' => $customer->id]);
            OrderLine::factory()->create([
                'order_id' => $order->id,
                'product_id' => Product::factory()->create()->id,
            ]);
        }
    }

    public function test_listing_orders_does_not_grow_with_the_number_of_orders(): void
    {
        $customer = User::factory()->create();

        $this->ordersFor($customer, 2);
        $withTwo = $this->countQueries(fn () => $this->actingAs($customer)->getJson('/api/orders')->assertOk());

        $this->ordersFor($customer, 8);
        $withTen = $this->countQueries(fn () => $this->actingAs($customer)->getJson('/api/orders')->assertOk());

        $this->assertSame($withTwo, $withTen, "Orders list: {$withTwo} queries for 2 orders, {$withTen} for 10.");
    }

    public function test_showing_one_order_uses_a_fixed_number_of_queries(): void
    {
        $customer = User::factory()->create();
        $order = Order::factory()->create(['user_id' => $customer->id]);

        OrderLine::factory()->count(1)->create(['order_id' => $order->id]);
        $withOneLine = $this->countQueries(fn () => $this->actingAs($customer)->getJson("/api/orders/{$order->id}")->assertOk());

        foreach (range(1, 4) as $i) {
            OrderLine::factory()->create(['order_id' => $order->id, 'product_id' => Product::factory()->create()->id]);
        }
        $withFiveLines = $this->countQueries(fn () => $this->actingAs($customer)->getJson("/api/orders/{$order->id}")->assertOk());

        $this->assertSame($withOneLine, $withFiveLines);
    }

    public function test_listing_notifications_does_not_grow(): void
    {
        $customer = User::factory()->create();

        Notification::factory()->count(2)->create(['user_id' => $customer->id]);
        $withTwo = $this->countQueries(fn () => $this->actingAs($customer)->getJson('/api/notifications')->assertOk());

        Notification::factory()->count(8)->create(['user_id' => $customer->id]);
        $withTen = $this->countQueries(fn () => $this->actingAs($customer)->getJson('/api/notifications')->assertOk());

        $this->assertSame($withTwo, $withTen);
    }

    public function test_the_cart_loads_its_products_in_one_go(): void
    {
        $customer = User::factory()->create();

        $this->actingAs($customer)->getJson('/api/cart')->assertOk(); // creates the cart

        $product = Product::factory()->create();
        Inventory::factory()->create(['product_id' => $product->id, 'on_hand' => 50]);
        $this->actingAs($customer)->postJson('/api/cart/lines', ['product_id' => $product->id, 'quantity' => 1]);

        $withOneLine = $this->countQueries(fn () => $this->actingAs($customer)->getJson('/api/cart')->assertOk());

        foreach (range(1, 3) as $i) {
            $other = Product::factory()->create();
            Inventory::factory()->create(['product_id' => $other->id, 'on_hand' => 50]);
            $this->actingAs($customer)->postJson('/api/cart/lines', ['product_id' => $other->id, 'quantity' => 1]);
        }

        $withFourLines = $this->countQueries(fn () => $this->actingAs($customer)->getJson('/api/cart')->assertOk());

        $this->assertSame($withOneLine, $withFourLines);
    }
}
