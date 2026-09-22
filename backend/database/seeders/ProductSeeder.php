<?php

namespace Database\Seeders;

use App\Models\Category;
use App\Models\Inventory;
use App\Models\Product;
use Illuminate\Database\Seeder;

/**
 * A real little catalogue: every product belongs to a sub-category (RG3),
 * has a unique SKU and slug (RG6), a price in centimes (RG7) and exactly
 * one inventory record (RG8).
 */
class ProductSeeder extends Seeder
{
    /**
     * category slug => [name, sku, price in centimes, attributes, stock]
     */
    private array $catalogue = [
        'phones' => [
            ['iPhone 15', 'IPH-15', 1199900, ['storage' => '128GB', 'color' => 'Black'], 18],
            ['iPhone 15 Pro', 'IPH-15P', 1599900, ['storage' => '256GB', 'color' => 'Titanium'], 9],
            ['Galaxy S24', 'SAM-S24', 999900, ['storage' => '256GB', 'color' => 'Grey'], 14],
            ['Galaxy A55', 'SAM-A55', 449900, ['storage' => '128GB', 'color' => 'Blue'], 30],
            ['Pixel 8', 'GOO-P8', 799900, ['storage' => '128GB', 'color' => 'Mint'], 11],
            ['Redmi Note 13', 'XIA-RN13', 229900, ['storage' => '128GB', 'color' => 'Black'], 40],
        ],
        'laptops' => [
            ['MacBook Air 13', 'APP-MBA13', 1399900, ['chip' => 'M3', 'ram' => '16GB'], 7],
            ['MacBook Pro 14', 'APP-MBP14', 2299900, ['chip' => 'M3 Pro', 'ram' => '18GB'], 4],
            ['ThinkPad E14', 'LEN-E14', 899900, ['cpu' => 'Ryzen 7', 'ram' => '16GB'], 10],
            ['Zenbook 14', 'ASU-ZB14', 1099900, ['cpu' => 'Intel Core 7', 'ram' => '16GB'], 6],
            ['Chromebook Plus', 'HP-CBP', 399900, ['cpu' => 'Intel i3', 'ram' => '8GB'], 15],
        ],
        'headphones' => [
            ['Studio wireless headphones', 'AUD-WH1', 149900, ['battery' => '30h', 'type' => 'Over-ear'], 25],
            ['Noise cancelling earbuds', 'AUD-EB2', 99900, ['battery' => '8h', 'type' => 'In-ear'], 35],
            ['Sport earbuds', 'AUD-EB3', 59900, ['battery' => '6h', 'waterproof' => 'IPX7'], 45],
            ['Classic wired headphones', 'AUD-WD4', 34900, ['cable' => '1.5m'], 20],
        ],
        'speakers' => [
            ['Compact bluetooth speaker', 'AUD-SP2', 79900, ['battery' => '12h'], 22],
            ['Party speaker XL', 'AUD-SPXL', 189900, ['battery' => '18h', 'power' => '80W'], 8],
            ['Desk speaker set', 'AUD-DSK', 64900, ['power' => '20W'], 16],
        ],
        'chargers' => [
            ['Fast charger 65W', 'ACC-CHG65', 39900, ['power' => '65W', 'ports' => '2'], 60],
            ['Travel charger 30W', 'ACC-CHG30', 24900, ['power' => '30W'], 48],
            ['Wireless charging pad', 'ACC-WRL', 29900, ['power' => '15W'], 26],
            ['Power bank 20000mAh', 'ACC-PWB', 54900, ['capacity' => '20000mAh'], 19],
        ],
        'cases' => [
            ['Leather phone case', 'ACC-CASE-L', 24900, ['material' => 'Leather', 'color' => 'Brown'], 55],
            ['Clear phone case', 'ACC-CASE-C', 12900, ['material' => 'Silicone'], 70],
            ['Laptop sleeve 14"', 'ACC-SLV14', 34900, ['size' => '14 inch'], 24],
            ['Braided USB-C cable', 'ACC-CBL', 12900, ['length' => '2m'], 80],
        ],
        'lighting' => [
            ['Desk lamp', 'HOM-LAMP', 44900, ['color' => 'Sage', 'bulb' => 'LED'], 28],
            ['Floor lamp', 'HOM-FLOOR', 89900, ['height' => '150cm'], 9],
            ['Smart bulb pack', 'HOM-BULB', 27900, ['pieces' => '3'], 33],
        ],
        'kitchen' => [
            ['Ceramic mug', 'HOM-MUG', 9900, ['volume' => '350ml'], 90],
            ['French press', 'HOM-PRESS', 34900, ['volume' => '1L'], 21],
            ['Electric kettle', 'HOM-KTL', 59900, ['power' => '2200W'], 17],
            ['Chef knife', 'HOM-KNF', 49900, ['blade' => '20cm'], 13],
        ],
    ];

    public function run(): void
    {
        foreach ($this->catalogue as $categorySlug => $products) {
            $category = Category::where('slug', $categorySlug)->first();

            if (! $category) {
                continue;
            }

            foreach ($products as [$name, $sku, $price, $attributes, $stock]) {
                $product = Product::firstOrCreate(
                    ['sku' => $sku],
                    [
                        'name' => $name,
                        'slug' => str($name)->slug()->value(),
                        'description' => "{$name}. Part of our {$category->name} selection, delivered in 48h.",
                        'price' => $price,
                        'is_active' => true,
                        'attributes' => $attributes,
                        'category_id' => $category->id,
                    ],
                );

                Inventory::firstOrCreate(
                    ['product_id' => $product->id],
                    ['on_hand' => $stock, 'reserved' => 0],
                );
            }
        }

        // Two products that are not on sale, so the "hidden" case exists.
        foreach ([['Old tablet', 'OLD-TAB', 299900], ['Discontinued mouse', 'OLD-MSE', 19900]] as [$name, $sku, $price]) {
            $product = Product::firstOrCreate(
                ['sku' => $sku],
                [
                    'name' => $name,
                    'slug' => str($name)->slug()->value(),
                    'description' => 'No longer sold.',
                    'price' => $price,
                    'is_active' => false,
                    'category_id' => Category::where('slug', 'seasonal')->value('id')
                        ?? Category::first()->id,
                ],
            );

            Inventory::firstOrCreate(
                ['product_id' => $product->id],
                ['on_hand' => 0, 'reserved' => 0],
            );
        }

        $this->command->info('Products: '.Product::count().' (with stock)');
    }
}
