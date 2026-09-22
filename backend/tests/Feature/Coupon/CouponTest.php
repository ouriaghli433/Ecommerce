<?php

namespace Tests\Feature\Coupon;

use App\Models\Coupon;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CouponTest extends TestCase
{
    use RefreshDatabase;

    public function test_an_admin_can_list_coupons(): void
    {
        $admin = User::factory()->admin()->create();
        Coupon::factory()->count(3)->create();

        $this->actingAs($admin)->getJson('/api/coupons')
            ->assertOk()
            ->assertJsonCount(3, 'data');
    }

    public function test_a_customer_cannot_see_coupons(): void
    {
        $customer = User::factory()->create();
        $coupon = Coupon::factory()->create();

        $this->actingAs($customer)->getJson('/api/coupons')->assertForbidden();
        $this->actingAs($customer)->getJson("/api/coupons/{$coupon->id}")->assertForbidden();
    }

    public function test_an_admin_can_create_a_coupon(): void
    {
        $admin = User::factory()->admin()->create();

        $this->actingAs($admin)->postJson('/api/coupons', [
            'code' => 'SUMMER20',
            'type' => 'percent',
            'value' => 20,
            'min_order_amount' => 50000,
            'expires_at' => now()->addMonth()->toDateTimeString(),
        ])->assertCreated()
            ->assertJsonPath('data.code', 'SUMMER20')
            ->assertJsonPath('data.value', 20);

        $this->assertDatabaseHas('coupons', ['code' => 'SUMMER20', 'type' => 'percent']);
    }

    public function test_create_validates_input(): void
    {
        $admin = User::factory()->admin()->create();
        Coupon::factory()->create(['code' => 'TAKEN']);

        $this->actingAs($admin)->postJson('/api/coupons', [
            'code' => 'TAKEN',
            'type' => 'gift',
            'value' => 0,
        ])->assertUnprocessable()
            ->assertJsonValidationErrors(['code', 'type', 'value']);
    }

    public function test_a_percent_coupon_cannot_exceed_100(): void
    {
        $admin = User::factory()->admin()->create();

        $this->actingAs($admin)->postJson('/api/coupons', [
            'code' => 'TOO-MUCH',
            'type' => 'percent',
            'value' => 150,
        ])->assertJsonValidationErrors('value');

        // the same value is fine for a fixed amount (1.50 MAD)
        $this->actingAs($admin)->postJson('/api/coupons', [
            'code' => 'FIXED-150',
            'type' => 'fixed',
            'value' => 150,
        ])->assertCreated();
    }

    public function test_expires_at_must_be_after_starts_at(): void
    {
        $admin = User::factory()->admin()->create();

        $this->actingAs($admin)->postJson('/api/coupons', [
            'code' => 'DATES',
            'type' => 'fixed',
            'value' => 1000,
            'starts_at' => '2026-10-10',
            'expires_at' => '2026-10-01',
        ])->assertJsonValidationErrors('expires_at');
    }

    public function test_an_admin_can_update_a_coupon(): void
    {
        $admin = User::factory()->admin()->create();
        $coupon = Coupon::factory()->create(['type' => 'percent', 'value' => 10]);

        $this->actingAs($admin)->patchJson("/api/coupons/{$coupon->id}", ['value' => 15, 'is_active' => false])
            ->assertOk()
            ->assertJsonPath('data.value', 15)
            ->assertJsonPath('data.is_active', false);

        // still a percent coupon, so 101 is refused
        $this->actingAs($admin)->patchJson("/api/coupons/{$coupon->id}", ['value' => 101])
            ->assertJsonValidationErrors('value');
    }

    public function test_an_admin_can_delete_an_unused_coupon(): void
    {
        $admin = User::factory()->admin()->create();
        $coupon = Coupon::factory()->create();

        $this->actingAs($admin)->deleteJson("/api/coupons/{$coupon->id}")->assertNoContent();

        $this->assertDatabaseMissing('coupons', ['id' => $coupon->id]);
    }

    public function test_a_customer_cannot_create_a_coupon(): void
    {
        $customer = User::factory()->create();

        $this->actingAs($customer)->postJson('/api/coupons', [
            'code' => 'FREE',
            'type' => 'percent',
            'value' => 100,
        ])->assertForbidden();
    }
}
