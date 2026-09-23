<?php

namespace App\Http\Controllers\Catalog;

use App\Http\Controllers\Controller;
use App\Http\Requests\Catalog\StoreProductImageRequest;
use App\Http\Requests\Catalog\UpdateProductImageRequest;
use App\Http\Resources\Catalog\ProductImageResource;
use App\Models\Product;
use App\Models\ProductImage;
use App\Services\Catalog\CatalogCache;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;

/**
 * Pictures of a product, managed by an admin.
 *
 * Two rules are kept here, because the database alone cannot express them:
 * - the first picture of a product becomes the main one;
 * - deleting the main picture promotes the next one, so a product with
 *   pictures always has one to show in the lists.
 */
class ProductImageController extends Controller
{
    /** GET /api/products/{product}/images */
    public function index(Product $product): AnonymousResourceCollection
    {
        return ProductImageResource::collection($product->images()->get());
    }

    /** POST /api/products/{product}/images */
    public function store(StoreProductImageRequest $request, Product $product, CatalogCache $cache): ProductImageResource
    {
        $image = DB::transaction(function () use ($request, $product) {
            $isFirst = ! $product->images()->exists();
            $wantsPrimary = $request->boolean('is_primary') || $isFirst;

            if ($wantsPrimary) {
                // Only one main picture per product (a unique index also
                // refuses a second one).
                $product->images()->update(['is_primary' => false]);
            }

            return $product->images()->create([
                'url' => $request->url,
                'alt_text' => $request->alt_text ?: $product->name,
                'display_order' => $request->integer('display_order', $product->images()->count()),
                'is_primary' => $wantsPrimary,
            ]);
        });

        $cache->flush();

        return new ProductImageResource($image);
    }

    /** PATCH /api/products/{product}/images/{image} */
    public function update(
        UpdateProductImageRequest $request,
        Product $product,
        ProductImage $image,
        CatalogCache $cache,
    ): ProductImageResource {
        $this->ensureBelongsToProduct($product, $image);

        DB::transaction(function () use ($request, $product, $image) {
            if ($request->boolean('is_primary')) {
                $product->images()->update(['is_primary' => false]);
            }

            $image->update($request->validated());
        });

        $cache->flush();

        return new ProductImageResource($image->fresh());
    }

    /** DELETE /api/products/{product}/images/{image} */
    public function destroy(Product $product, ProductImage $image, CatalogCache $cache): Response
    {
        Gate::authorize('update', $product);

        $this->ensureBelongsToProduct($product, $image);

        DB::transaction(function () use ($product, $image) {
            $wasPrimary = $image->is_primary;

            $image->delete();

            // The product keeps a main picture as long as it has pictures.
            if ($wasPrimary) {
                $next = $product->images()->orderBy('display_order')->first();

                $next?->update(['is_primary' => true]);
            }
        });

        $cache->flush();

        return response()->noContent();
    }

    /** A picture of another product must not be touched from this URL. */
    private function ensureBelongsToProduct(Product $product, ProductImage $image): void
    {
        if ($image->product_id !== $product->id) {
            abort(404);
        }
    }
}
