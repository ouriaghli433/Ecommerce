<?php

namespace Database\Seeders;

use App\Models\Address;
use App\Models\User;
use Illuminate\Database\Seeder;

/**
 * Every customer gets a default delivery address, and some get a second one
 * (RG17, RG18: at most one default).
 */
class AddressSeeder extends Seeder
{
    private array $cities = [
        ['Rabat', '10000'],
        ['Casablanca', '20000'],
        ['Marrakech', '40000'],
        ['Fès', '30000'],
        ['Tanger', '90000'],
        ['Agadir', '80000'],
    ];

    public function run(): void
    {
        $customers = User::where('role', 'customer')->get();

        foreach ($customers as $customer) {
            if ($customer->addresses()->exists()) {
                continue;
            }

            [$city, $postalCode] = $this->cities[array_rand($this->cities)];

            Address::create([
                'user_id' => $customer->id,
                'full_name' => $customer->first_name.' '.$customer->last_name,
                'phone' => '06'.fake()->numerify('########'),
                'address_line' => fake()->buildingNumber().' '.fake()->streetName(),
                'city' => $city,
                'postal_code' => $postalCode,
                'country' => 'MA',
                'is_default' => true,
            ]);

            // About one customer in three also has a work address.
            if (random_int(1, 3) === 1) {
                [$otherCity, $otherPostalCode] = $this->cities[array_rand($this->cities)];

                Address::create([
                    'user_id' => $customer->id,
                    'full_name' => $customer->first_name.' '.$customer->last_name,
                    'phone' => '06'.fake()->numerify('########'),
                    'address_line' => fake()->buildingNumber().' '.fake()->streetName(),
                    'city' => $otherCity,
                    'postal_code' => $otherPostalCode,
                    'country' => 'MA',
                    'is_default' => false,
                ]);
            }
        }

        $this->command->info('Addresses: '.Address::count());
    }
}
