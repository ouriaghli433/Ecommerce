<?php

namespace Database\Factories;

use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\ShippingPrice>
 */
class ShippingPriceFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $cities = [
            'Tangier',
            'Tetouan',
            'Chefchaouen',
            'Al Hoceima',
            'Larache',
            'Asilah',
            'Rabat',
            'Casablanca',
            'Marrakech',
            'Fes',
            'Meknes',
            'Agadir',
            'Oujda',
            'Kenitra',
            'Safi',
            'El Jadida',
            'Beni Mellal',
            'Nador',
            'Taza',
            'Settat',
        ];
        return [
            'city' => fake()->unique()->randomElement($cities),
            'cost' => fake()->numberBetween(2000, 8000),
            'is_active' => true,
        ];
    }
}
