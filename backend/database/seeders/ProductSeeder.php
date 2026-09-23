<?php

namespace Database\Seeders;

use App\Models\Category;
use App\Models\Inventory;
use App\Models\Product;
use App\Models\ProductImage;
use Illuminate\Database\Seeder;

/**
 * The catalogue, with pictures that really show each product.
 *
 * Every product obeys the rules: one category (RG3), a unique SKU and slug
 * (RG6), a price in centimes (RG7), exactly one inventory record (RG8), and
 * its own gallery.
 *
 * The photos are served by cdn.dummyjson.com, a free set of real product
 * pictures. Each line names the photo folder and how many views it has, so
 * a phone shows a phone and a charger shows a charger. In a real shop these
 * URLs would point to your own storage.
 */
class ProductSeeder extends Seeder
{
    private const IMAGE_BASE = 'https://cdn.dummyjson.com/product-images';

    /**
     * category slug => [name, sku, price in centimes, attributes, stock,
     *                   photo folder, number of photos]
     */
    private array $catalogue = [
        'phones' => [
            ['iPhone 13 Pro', 'IPH-13P', 1099900, ['storage' => '256GB', 'color' => 'Sierra Blue'], 18, 'smartphones/iphone-13-pro', 3],
            ['iPhone X', 'IPH-X', 899900, ['storage' => '128GB', 'color' => 'Space Grey'], 12, 'smartphones/iphone-x', 3],
            ['Samsung Galaxy S10', 'SAM-S10', 699900, ['storage' => '128GB', 'color' => 'Prism Black'], 15, 'smartphones/samsung-galaxy-s10', 3],
            ['Samsung Galaxy S8', 'SAM-S8', 499900, ['storage' => '64GB', 'color' => 'Midnight'], 20, 'smartphones/samsung-galaxy-s8', 3],
            ['Oppo F19 Pro Plus', 'OPP-F19P', 399900, ['storage' => '128GB', 'color' => 'Fluid Black'], 22, 'smartphones/oppo-f19-pro-plus', 3],
            ['Realme C35', 'REA-C35', 149900, ['storage' => '64GB', 'color' => 'Glowing Green'], 34, 'smartphones/realme-c35', 3],
            ['Vivo X21', 'VIV-X21', 499900, ['storage' => '128GB', 'color' => 'Black'], 16, 'smartphones/vivo-x21', 3],
        ],
        'laptops' => [
            ['Apple MacBook Pro 14"', 'APP-MBP14', 1999900, ['chip' => 'M3 Pro', 'ram' => '18GB'], 7, 'laptops/apple-macbook-pro-14-inch-space-grey', 3],
            ['Asus Zenbook Pro Dual Screen', 'ASU-ZBPRO', 1799900, ['cpu' => 'Intel Core i9', 'ram' => '32GB'], 5, 'laptops/asus-zenbook-pro-dual-screen-laptop', 3],
            ['Huawei Matebook X Pro', 'HUA-MBXP', 1399900, ['cpu' => 'Intel Core i7', 'ram' => '16GB'], 8, 'laptops/huawei-matebook-x-pro', 3],
            ['Lenovo Yoga 920', 'LEN-Y920', 1099900, ['cpu' => 'Intel Core i7', 'ram' => '16GB'], 10, 'laptops/lenovo-yoga-920', 3],
            ['Dell XPS 13 9300', 'DEL-XPS13', 1499900, ['cpu' => 'Intel Core i7', 'ram' => '16GB'], 6, 'laptops/new-dell-xps-13-9300-laptop', 3],
        ],
        'tablets' => [
            ['iPad Mini 2021 Starlight', 'APP-IPADM', 499900, ['screen' => '8.3 inch', 'storage' => '64GB'], 14, 'tablets/ipad-mini-2021-starlight', 4],
            ['Samsung Galaxy Tab S8 Plus', 'SAM-TABS8', 599900, ['screen' => '12.4 inch', 'storage' => '128GB'], 9, 'tablets/samsung-galaxy-tab-s8-plus-grey', 4],
            ['Samsung Galaxy Tab White', 'SAM-TABW', 349900, ['screen' => '10.4 inch', 'storage' => '64GB'], 17, 'tablets/samsung-galaxy-tab-white', 4],
        ],
        'headphones' => [
            ['Apple AirPods', 'APP-AIRP', 129900, ['battery' => '24h', 'type' => 'In-ear'], 40, 'mobile-accessories/apple-airpods', 3],
            ['Apple AirPods Max Silver', 'APP-AIRPM', 549900, ['battery' => '20h', 'type' => 'Over-ear'], 11, 'mobile-accessories/apple-airpods-max-silver', 1],
            ['Beats Flex Wireless Earphones', 'BEA-FLEX', 49900, ['battery' => '12h', 'type' => 'In-ear'], 45, 'mobile-accessories/beats-flex-wireless-earphones', 1],
        ],
        'speakers' => [
            ['Amazon Echo Plus', 'AMZ-ECHOP', 99900, ['assistant' => 'Alexa', 'power' => '30W'], 21, 'mobile-accessories/amazon-echo-plus', 2],
            ['Apple HomePod Mini', 'APP-HPMINI', 99900, ['assistant' => 'Siri', 'color' => 'Cosmic Grey'], 19, 'mobile-accessories/apple-homepod-mini-cosmic-grey', 1],
        ],
        'chargers' => [
            ['Apple iPhone Charger', 'APP-CHG', 19900, ['power' => '5W', 'cable' => 'Lightning'], 60, 'mobile-accessories/apple-iphone-charger', 2],
            ['Apple AirPower Wireless Charger', 'APP-WRL', 79900, ['power' => '15W', 'type' => 'Wireless'], 26, 'mobile-accessories/apple-airpower-wireless-charger', 1],
            ['Apple MagSafe Battery Pack', 'APP-MAGB', 99900, ['capacity' => '1460mAh', 'type' => 'MagSafe'], 23, 'mobile-accessories/apple-magsafe-battery-pack', 2],
        ],
        'phone-cases' => [
            ['iPhone 12 Silicone Case MagSafe', 'ACC-CASE12', 29900, ['material' => 'Silicone', 'color' => 'Plum'], 55, 'mobile-accessories/iphone-12-silicone-case-with-magsafe-plum', 4],
            ['Selfie Stick Monopod', 'ACC-SELF', 12900, ['length' => '80cm'], 38, 'mobile-accessories/selfie-stick-monopod', 1],
            ['Monopod', 'ACC-MONO', 19900, ['length' => '120cm', 'material' => 'Aluminium'], 27, 'mobile-accessories/monopod', 2],
        ],
        'lighting-decoration' => [
            ['Table Lamp', 'HOM-LAMP', 49900, ['bulb' => 'E27', 'style' => 'Classic'], 28, 'home-decoration/table-lamp', 1],
            ['Plant Pot', 'HOM-POT', 14900, ['material' => 'Ceramic', 'size' => 'Medium'], 44, 'home-decoration/plant-pot', 4],
            ['House Showpiece Plant', 'HOM-PLANT', 39900, ['height' => '60cm'], 18, 'home-decoration/house-showpiece-plant', 3],
            ['Family Tree Photo Frame', 'HOM-FRAME', 29900, ['photos' => '7'], 25, 'home-decoration/family-tree-photo-frame', 1],
        ],
        'kitchen' => [
            ['Microwave Oven', 'KIT-MICRO', 89900, ['power' => '800W', 'volume' => '20L'], 12, 'kitchen-accessories/microwave-oven', 4],
            ['Boxed Blender', 'KIT-BLEND', 39900, ['power' => '500W', 'volume' => '1.5L'], 16, 'kitchen-accessories/boxed-blender', 4],
            ['Electric Stove', 'KIT-STOVE', 49900, ['power' => '1500W', 'plates' => '1'], 14, 'kitchen-accessories/electric-stove', 4],
            ['Silver Pot With Glass Cap', 'KIT-POT', 39900, ['material' => 'Stainless steel', 'volume' => '3L'], 20, 'kitchen-accessories/silver-pot-with-glass-cap', 1],
            ['Carbon Steel Wok', 'KIT-WOK', 29900, ['material' => 'Carbon steel', 'size' => '30cm'], 24, 'kitchen-accessories/carbon-steel-wok', 1],
            ['Chef Knife', 'KIT-KNIFE', 14900, ['blade' => '20cm', 'material' => 'Steel'], 30, 'kitchen-accessories/knife', 1],
            ['Chopping Board', 'KIT-BOARD', 12900, ['material' => 'Wood', 'size' => '35cm'], 36, 'kitchen-accessories/chopping-board', 1],
            ['Mug Tree Stand', 'KIT-MUGT', 15900, ['material' => 'Wood', 'mugs' => '6'], 29, 'kitchen-accessories/mug-tree-stand', 2],
        ],
    ];

    /** Two products no longer sold, to show the "hidden" case. */
    private array $retired = [
        ['iPhone 5s', 'IPH-5S', 199900, 'smartphones/iphone-5s', 3],
        ['Samsung Galaxy S7', 'SAM-S7', 299900, 'smartphones/samsung-galaxy-s7', 3],
    ];

    public function run(): void
    {
        foreach ($this->catalogue as $categorySlug => $products) {
            $category = Category::where('slug', $categorySlug)->first();

            if (! $category) {
                continue;
            }

            foreach ($products as [$name, $sku, $price, $attributes, $stock, $photoFolder, $photoCount]) {
                $product = $this->makeProduct($name, $sku, $price, $attributes, $category, true);

                Inventory::firstOrCreate(
                    ['product_id' => $product->id],
                    ['on_hand' => $stock, 'reserved' => 0],
                );

                $this->addPictures($product, $photoFolder, $photoCount);
            }
        }

        $seasonal = Category::where('slug', 'seasonal')->first() ?? Category::first();

        foreach ($this->retired as [$name, $sku, $price, $photoFolder, $photoCount]) {
            $product = $this->makeProduct($name, $sku, $price, [], $seasonal, false);

            Inventory::firstOrCreate(
                ['product_id' => $product->id],
                ['on_hand' => 0, 'reserved' => 0],
            );

            $this->addPictures($product, $photoFolder, $photoCount);
        }

        $this->command->info('Products: '.Product::count().' · pictures: '.ProductImage::count());
    }

    private function makeProduct(
        string $name,
        string $sku,
        int $price,
        array $attributes,
        Category $category,
        bool $active,
    ): Product {
        return Product::firstOrCreate(
            ['sku' => $sku],
            [
                'name' => $name,
                'slug' => str($name)->slug()->value(),
                'description' => $active
                    ? "{$name}. Part of our {$category->name} selection, delivered in 48h."
                    : "{$name}. This model is no longer sold.",
                'price' => $price,
                'is_active' => $active,
                'attributes' => $attributes ?: null,
                'category_id' => $category->id,
            ],
        );
    }

    /**
     * The photo folder holds views numbered 1, 2, 3... The first one is the
     * main picture shown in the lists (RG: one main picture per product).
     */
    private function addPictures(Product $product, string $photoFolder, int $photoCount): void
    {
        if ($product->images()->exists()) {
            return;
        }

        for ($position = 0; $position < $photoCount; $position++) {
            $product->images()->create([
                'url' => self::IMAGE_BASE."/{$photoFolder}/".($position + 1).'.webp',
                'alt_text' => $position === 0
                    ? $product->name
                    : "{$product->name} — view ".($position + 1),
                'display_order' => $position,
                'is_primary' => $position === 0,
            ]);
        }
    }
}
