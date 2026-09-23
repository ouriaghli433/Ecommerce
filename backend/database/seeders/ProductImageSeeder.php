<?php

namespace Database\Seeders;

use App\Models\Product;
use App\Models\ProductImage;
use Illuminate\Database\Seeder;

/**
 * Gives every product a small gallery.
 *
 * The pictures come from picsum.photos, which serves a real photo for any
 * "seed" word. Using the SKU as the seed means a product always gets the
 * same pictures, so the demo looks stable between two seedings.
 *
 * In a real shop these URLs would point to your own storage.
 */
class ProductImageSeeder extends Seeder
{
    public function run(): void
    {
        $products = Product::with('images')->get();

        foreach ($products as $product) {
            if ($product->images->isNotEmpty()) {
                continue; // already has pictures
            }

            // Three views of the product: the first one is the main picture.
            for ($position = 0; $position < 3; $position++) {
                ProductImage::create([
                    'product_id' => $product->id,
                    'url' => $this->pictureUrl($product->sku, $position),
                    'alt_text' => $position === 0
                        ? $product->name
                        : "{$product->name} — view ".($position + 1),
                    'display_order' => $position,
                    'is_primary' => $position === 0,
                ]);
            }
        }

        $this->command->info('Product images: '.ProductImage::count());
    }

    private function pictureUrl(string $sku, int $position): string
    {
        $seed = strtolower($sku).'-'.$position;

        return "https://picsum.photos/seed/{$seed}/800/800";
    }
}
