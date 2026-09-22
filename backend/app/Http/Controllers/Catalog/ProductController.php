<?php

namespace App\Http\Controllers\Catalog;

use App\Http\Controllers\Controller;
use App\Http\Requests\Catalog\StoreProductRequest;
use App\Http\Requests\Catalog\UpdateProductRequest;
use App\Http\Resources\Catalog\ProductResource;
use App\Models\Product;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;

class ProductController extends Controller
{
    /**
     * Filters: ?category_id=...  ?search=...
     */
    public function index(Request $request): AnonymousResourceCollection
    {
        $query = Product::with(['category', 'inventory'])->latest();

        // Customers and guests only see active products (RG5).
        if (! $this->isAdmin($request)) {
            $query->where('is_active', true);
        }

        if ($request->filled('category_id')) {
            $query->where('category_id', $request->category_id);
        }

        if ($request->filled('search')) {
            $query->where('name', 'ilike', '%'.$request->search.'%');
        }

        return ProductResource::collection($query->paginate(15));
    }

    public function show(Request $request, Product $product): ProductResource
    {
        if (! $product->is_active && ! $this->isAdmin($request)) {
            abort(404);
        }

        $product->load(['category', 'inventory']);

        return new ProductResource($product);
    }

    public function store(StoreProductRequest $request): ProductResource
    {
        // Every product has exactly one inventory record (RG8).
        // It starts empty; stock is added later with an inventory movement.
        $product = DB::transaction(function () use ($request) {
            $product = Product::create($request->validated());
            $product->inventory()->create(['on_hand' => 0, 'reserved' => 0]);

            return $product;
        });

        $product->load(['category', 'inventory']);

        return new ProductResource($product);
    }

    public function update(UpdateProductRequest $request, Product $product): ProductResource
    {
        $product->update($request->validated());

        $product->load(['category', 'inventory']);

        return new ProductResource($product);
    }

    public function destroy(Product $product): Response|JsonResponse
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

        return response()->noContent();
    }
}
