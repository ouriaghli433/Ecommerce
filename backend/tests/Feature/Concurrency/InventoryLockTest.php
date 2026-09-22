<?php

namespace Tests\Feature\Concurrency;

use App\Models\Address;
use App\Models\Cart;
use App\Models\CartLine;
use App\Models\Coupon;
use App\Models\Inventory;
use App\Models\Product;
use App\Models\User;
use App\Services\Checkout\CheckoutService;
use App\Services\Inventory\InventoryService;
use Illuminate\Database\Connection;
use Illuminate\Database\QueryException;
use Illuminate\Foundation\Testing\DatabaseTruncation;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Tests\TestCase;

/**
 * These tests prove the locking really happens in Postgres.
 *
 * They use DatabaseTruncation instead of RefreshDatabase: RefreshDatabase
 * keeps everything inside one transaction that is rolled back, and a second
 * connection cannot see uncommitted rows. Here the data is really committed,
 * so a second connection behaves like a second web request.
 */
class InventoryLockTest extends TestCase
{
    use DatabaseTruncation;

    /**
     * These tests really COMMIT their rows, so they must clean up after
     * themselves. Otherwise the rows stay in the test database and the next
     * test classes count them by mistake.
     */
    protected function tearDown(): void
    {
        $this->truncateTablesForAllConnections();

        parent::tearDown();
    }

    /** A second database connection, like a second user's request. */
    private function otherConnection(): Connection
    {
        return DB::build(array_merge(config('database.connections.pgsql'), [
            'name' => 'second-request',
        ]));
    }

    public function test_a_locked_inventory_row_blocks_a_second_request(): void
    {
        $product = Product::factory()->create();
        $inventory = Inventory::factory()->create(['product_id' => $product->id, 'on_hand' => 5]);

        DB::beginTransaction();

        // Request 1 locks the row (this is what checkout does first).
        app(InventoryService::class)->lockInventories([$product->id]);

        // Request 2 asks for the same row. NOWAIT means "do not queue, fail
        // now", which lets the test see the lock instead of hanging.
        $blocked = false;

        try {
            $this->otherConnection()
                ->select('select * from inventories where id = ? for update nowait', [$inventory->id]);
        } catch (QueryException $e) {
            $blocked = true;
        }

        DB::rollBack();

        $this->assertTrue($blocked, 'The second request should not be able to lock the same inventory row.');
    }

    public function test_the_row_is_free_again_after_the_transaction_ends(): void
    {
        $product = Product::factory()->create();
        $inventory = Inventory::factory()->create(['product_id' => $product->id]);

        DB::beginTransaction();
        app(InventoryService::class)->lockInventories([$product->id]);
        DB::rollBack();

        // No exception this time.
        $rows = $this->otherConnection()
            ->select('select * from inventories where id = ? for update nowait', [$inventory->id]);

        $this->assertCount(1, $rows);
    }

    public function test_inventory_rows_are_always_locked_in_the_same_order(): void
    {
        // Locking in a fixed order is what stops two checkouts from waiting
        // for each other forever (a deadlock).
        $products = Product::factory()->count(3)->create();
        $products->each(fn ($p) => Inventory::factory()->create(['product_id' => $p->id]));

        DB::enableQueryLog();

        DB::transaction(function () use ($products) {
            app(InventoryService::class)->lockInventories($products->pluck('id')->reverse()->all());
        });

        $sql = collect(DB::getQueryLog())->pluck('query')->implode(' ');
        DB::disableQueryLog();

        $this->assertStringContainsString('order by "product_id" asc', $sql);
        $this->assertStringContainsString('for update', $sql);
    }

    public function test_two_customers_cannot_reserve_the_same_last_item(): void
    {
        // One unit in stock, two customers with it in their cart.
        $product = Product::factory()->create(['price' => 10000]);
        Inventory::factory()->create(['product_id' => $product->id, 'on_hand' => 1, 'reserved' => 0]);

        $checkout = app(CheckoutService::class);
        $orders = [];
        $errors = 0;

        foreach (range(1, 2) as $i) {
            $customer = User::factory()->create();
            $address = Address::factory()->create(['user_id' => $customer->id]);
            $cart = Cart::factory()->create(['user_id' => $customer->id]);
            CartLine::factory()->create([
                'cart_id' => $cart->id,
                'product_id' => $product->id,
                'quantity' => 1,
                'unit_price' => 10000,
            ]);

            try {
                $orders[] = $checkout->checkout($customer, $address);
            } catch (ValidationException $e) {
                $errors++;
            }
        }

        $this->assertCount(1, $orders, 'Only one customer should get the last item.');
        $this->assertSame(1, $errors);
        $this->assertDatabaseHas('inventories', ['product_id' => $product->id, 'on_hand' => 1, 'reserved' => 1]);
    }

    public function test_the_coupon_row_is_locked_during_checkout(): void
    {
        $coupon = Coupon::factory()->create(['code' => 'LOCKED', 'max_usage' => 1]);

        $product = Product::factory()->create(['price' => 10000]);
        Inventory::factory()->create(['product_id' => $product->id, 'on_hand' => 5]);

        $customer = User::factory()->create();
        $address = Address::factory()->create(['user_id' => $customer->id]);
        $cart = Cart::factory()->create(['user_id' => $customer->id]);
        CartLine::factory()->create(['cart_id' => $cart->id, 'product_id' => $product->id, 'quantity' => 1]);

        DB::enableQueryLog();
        app(CheckoutService::class)->checkout($customer, $address, 'LOCKED');
        $sql = collect(DB::getQueryLog())->pluck('query')->implode(' ');
        DB::disableQueryLog();

        $this->assertStringContainsString('from "coupons" where "code" = ? limit 1 for update', $sql);

        // and the limit really holds for the next customer
        $second = User::factory()->create();
        $secondAddress = Address::factory()->create(['user_id' => $second->id]);
        $secondCart = Cart::factory()->create(['user_id' => $second->id]);
        CartLine::factory()->create(['cart_id' => $secondCart->id, 'product_id' => $product->id, 'quantity' => 1]);

        $this->expectException(ValidationException::class);
        app(CheckoutService::class)->checkout($second, $secondAddress, 'LOCKED');
    }
}
