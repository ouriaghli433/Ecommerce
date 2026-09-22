<?php

namespace Tests\Feature\Address;

use App\Models\Address;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AddressTest extends TestCase
{
    use RefreshDatabase;

    private function validAddress(array $overrides = []): array
    {
        return array_merge([
            'full_name' => 'Sara Alami',
            'phone' => '0612345678',
            'address_line' => '12 Rue Hassan II',
            'city' => 'Rabat',
            'postal_code' => '10000',
            'country' => 'MA',
        ], $overrides);
    }

    public function test_a_customer_only_sees_their_own_addresses(): void
    {
        $customer = User::factory()->create();
        Address::factory()->count(2)->create(['user_id' => $customer->id]);
        Address::factory()->create(); // someone else's

        $this->actingAs($customer)->getJson('/api/addresses')
            ->assertOk()
            ->assertJsonCount(2, 'data');
    }

    public function test_a_guest_cannot_list_addresses(): void
    {
        $this->getJson('/api/addresses')->assertUnauthorized();
    }

    public function test_a_customer_can_create_an_address(): void
    {
        $customer = User::factory()->create();

        $this->actingAs($customer)->postJson('/api/addresses', $this->validAddress())
            ->assertCreated()
            ->assertJsonPath('data.city', 'Rabat');

        $this->assertDatabaseHas('addresses', ['user_id' => $customer->id, 'city' => 'Rabat']);
    }

    public function test_create_validates_input(): void
    {
        $customer = User::factory()->create();

        $this->actingAs($customer)->postJson('/api/addresses', ['country' => 'Morocco'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['full_name', 'phone', 'address_line', 'city', 'country']);
    }

    public function test_a_new_default_address_replaces_the_old_one(): void
    {
        $customer = User::factory()->create();
        $old = Address::factory()->create(['user_id' => $customer->id, 'is_default' => true]);

        $this->actingAs($customer)->postJson('/api/addresses', $this->validAddress(['is_default' => true]))
            ->assertCreated()
            ->assertJsonPath('data.is_default', true);

        $this->assertDatabaseHas('addresses', ['id' => $old->id, 'is_default' => false]);
        $this->assertSame(1, $customer->addresses()->where('is_default', true)->count());
    }

    public function test_a_customer_can_update_their_address(): void
    {
        $customer = User::factory()->create();
        $address = Address::factory()->create(['user_id' => $customer->id]);

        $this->actingAs($customer)->patchJson("/api/addresses/{$address->id}", ['city' => 'Fes'])
            ->assertOk()
            ->assertJsonPath('data.city', 'Fes');
    }

    public function test_a_customer_cannot_see_or_change_another_customers_address(): void
    {
        $customer = User::factory()->create();
        $address = Address::factory()->create();

        $this->actingAs($customer)->getJson("/api/addresses/{$address->id}")->assertForbidden();
        $this->actingAs($customer)->patchJson("/api/addresses/{$address->id}", ['city' => 'Fes'])->assertForbidden();
        $this->actingAs($customer)->deleteJson("/api/addresses/{$address->id}")->assertForbidden();
    }

    public function test_a_customer_can_delete_their_address(): void
    {
        $customer = User::factory()->create();
        $address = Address::factory()->create(['user_id' => $customer->id]);

        $this->actingAs($customer)->deleteJson("/api/addresses/{$address->id}")->assertNoContent();

        $this->assertDatabaseMissing('addresses', ['id' => $address->id]);
    }
}
