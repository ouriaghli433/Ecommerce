<?php

namespace App\Http\Controllers\Catalog;

use App\Http\Controllers\Controller;
use App\Http\Requests\Catalog\StoreProductRequest;
use App\Http\Requests\Catalog\UpdateProductRequest;
use App\Http\Resources\Catalog\ProductResource;
use App\Models\Product;
use App\Services\Catalog\CatalogCache;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;

class ProductController extends Controller
{
    /**
     * Filters: ?category_id=...  ?search=...
     */
    public function index(Request $request, CatalogCache $cache): JsonResponse
    {
        $isAdmin = $this->isAdmin($request);

        // What makes this page of results unique.
        $parts = [
            'admin' => $isAdmin,
            'category_id' => $request->query('category_id'),
            'search' => $request->query('search'),
            'page' => $request->query('page', 1),
        ];

        // The listing is cached WITHOUT stock: `inventory` is not loaded here,
        // so a cached page can never show an old available_stock. The product
        // page (show) reads the stock live from the database.
        $payload = $cache->remember('products', $parts, function () use ($request, $isAdmin) {
            $query = Product::with('category')->latest();

            // Customers and guests only see active products (RG5).
            if (! $isAdmin) {
                $query->where('is_active', true);
            }

            if ($request->filled('category_id')) {
                $query->where('category_id', $request->category_id);
            }

            if ($request->filled('search')) {
                $query->where('name', 'ilike', '%'.$request->search.'%');
            }

            return ProductResource::collection($query->paginate(15))->response()->getData(true);
        });

        return response()->json($payload);
    }

    public function show(Request $request, Product $product): ProductResource
    {
        if (! $product->is_active && ! $this->isAdmin($request)) {
            abort(404);
        }

        $product->load(['category', 'inventory']);

        return new ProductResource($product);
    }

    public function store(StoreProductRequest $request, CatalogCache $cache): ProductResource
    {
        // Every product has exactly one inventory record (RG8).
        // It starts empty; stock is added later with an inventory movement.
        $product = DB::transaction(function () use ($request) {
            $product = Product::create($request->validated());
            $product->inventory()->create(['on_hand' => 0, 'reserved' => 0]);

            return $product;
        });

        $product->load(['category', 'inventory']);

        $cache->flush();

        return new ProductResource($product);
    }

    public function update(UpdateProductRequest $request, Product $product, CatalogCache $cache): ProductResource
    {
        $product->update($request->validated());

        $product->load(['category', 'inventory']);

        // Price, name or visibility may have changed: drop the cached lists.
        $cache->flush();

        return new ProductResource($product);
    }

    public function destroy(Product $product, CatalogCache $cache): Response|JsonResponse
    {
        Gate::authorize('delete', $product);

        // A product with history must be kept; set is_active to false instead.
        $hasHistory = $product->orderLines()->exists()
            || $product->cartLines()->exists()
            || $product->inventoryMovements()->exists();

        if ($hasHistory) {
            return response()->json([
                'message' => 'This product has orders, carts or stock history. Deactivate it instead.',
            ], 422);
        }

        DB::transaction(function () use ($product) {
            $product->inventory()->delete();
            $product->delete();
        });

        $cache->flush();

        return response()->noContent();
    }
}
