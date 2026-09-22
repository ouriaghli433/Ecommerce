<?php

namespace Tests\Feature\Concurrency;

use App\Models\Cart;
use App\Models\User;
use Illuminate\Database\QueryException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Tests\TestCase;

/**
 * RG13: one active cart per customer, guaranteed by the database.
 */
class ActiveCartUniquenessTest extends TestCase
{
    use RefreshDatabase;

    public function test_a_customer_can_keep_old_carts_but_only_one_active(): void
    {
        $customer = User::factory()->create();

        Cart::factory()->create(['user_id' => $customer->id, 'status' => 'converted']);
        Cart::factory()->create(['user_id' => $customer->id, 'status' => 'abandoned']);
        Cart::factory()->create(['user_id' => $customer->id, 'status' => 'active']);

        $this->assertSame(3, $customer->carts()->count());
    }

    public function test_asking_for_the_cart_many_times_creates_only_one(): void
    {
        $customer = User::factory()->create();

        $first = $this->actingAs($customer)->getJson('/api/cart')->assertOk()->json('data.id');
        $second = $this->actingAs($customer)->getJson('/api/cart')->assertOk()->json('data.id');

        $this->assertSame($first, $second);
        $this->assertSame(1, $customer->carts()->count());
    }

    public function test_the_database_refuses_a_second_active_cart(): void
    {
        $customer = User::factory()->create();
        Cart::factory()->create(['user_id' => $customer->id, 'status' => 'active']);

        // This is what a racing second request would try to do.
        $this->expectException(QueryException::class);

        Cart::create([
            'id' => (string) Str::uuid(),
            'user_id' => $customer->id,
            'status' => 'active',
        ]);
    }
}
