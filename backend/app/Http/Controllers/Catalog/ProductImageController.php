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
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Storage;

/**
 * Pictures of a product, managed by an admin.
 *
 * A picture can be uploaded from the computer (stored in
 * storage/app/public/products and served from /storage/...) or given as an
 * address on the internet, which is what the demo data uses.
 *
 * Two rules live here, because the database alone cannot express them:
 * - the first picture of a product becomes the main one;
 * - deleting the main picture promotes the next one, so a product with
 *   pictures always has one to show in the lists.
 */
class ProductImageController extends Controller
{
    /** Where uploaded pictures live, and the start of their public address. */
    private const DISK = 'public';

    private const FOLDER = 'products';

    /** GET /api/products/{product}/images */
    public function index(Product $product): AnonymousResourceCollection
    {
        return ProductImageResource::collection($product->images()->get());
    }

    /** POST /api/products/{product}/images */
    public function store(StoreProductImageRequest $request, Product $product, CatalogCache $cache): ProductImageResource
    {
        // The file is saved BEFORE the transaction: writing a file is not
        // something a database rollback can undo, so it is kept simple and
        // cleaned up by hand if the row cannot be created.
        $url = $request->hasFile('file')
            ? $this->storeUploadedFile($request->file('file'), $product)
            : $request->url;

        try {
            $image = DB::transaction(function () use ($request, $product, $url) {
                $isFirst = ! $product->images()->exists();
                $wantsPrimary = $request->boolean('is_primary') || $isFirst;

                if ($wantsPrimary) {
                    // Only one main picture per product (a unique index also
                    // refuses a second one).
                    $product->images()->update(['is_primary' => false]);
                }

                return $product->images()->create([
                    'url' => $url,
                    'alt_text' => $request->alt_text ?: $product->name,
                    'display_order' => $request->integer('display_order', $product->images()->count()),
                    'is_primary' => $wantsPrimary,
                ]);
            });
        } catch (\Throwable $e) {
            $this->deleteStoredFile($url);

            throw $e;
        }

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

        $url = $image->url;

        DB::transaction(function () use ($product, $image) {
            $wasPrimary = $image->is_primary;

            $image->delete();

            // The product keeps a main picture as long as it has pictures.
            if ($wasPrimary) {
                $next = $product->images()->orderBy('display_order')->first();

                $next?->update(['is_primary' => true]);
            }
        });

        // The row is gone, so the file is useless now.
        $this->deleteStoredFile($url);

        $cache->flush();

        return response()->noContent();
    }

    /**
     * Saves the uploaded picture and returns the address the shop will use.
     * Laravel gives the file a random name, so two photos called "IMG_1.jpg"
     * never overwrite each other.
     */
    private function storeUploadedFile(UploadedFile $file, Product $product): string
    {
        $path = $file->store(self::FOLDER.'/'.$product->id, self::DISK);

        // Full address, because the shop runs on another port than the API.
        return Storage::disk(self::DISK)->url($path);
    }

    /**
     * Deletes the file behind an address, but only when we stored it
     * ourselves. A picture taken from the internet has nothing to delete.
     */
    private function deleteStoredFile(?string $url): void
    {
        if (! $url) {
            return;
        }

        $marker = '/storage/'.self::FOLDER.'/';
        $position = strpos($url, $marker);

        if ($position === false) {
            return;
        }

        $path = self::FOLDER.'/'.substr($url, $position + strlen($marker));

        Storage::disk(self::DISK)->delete($path);
    }

    /** A picture of another product must not be touched from this URL. */
    private function ensureBelongsToProduct(Product $product, ProductImage $image): void
    {
        if ($image->product_id !== $product->id) {
            abort(404);
        }
    }
}
