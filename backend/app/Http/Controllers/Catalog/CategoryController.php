<?php

namespace App\Http\Controllers\Catalog;

use App\Http\Controllers\Controller;
use App\Http\Requests\Catalog\StoreCategoryRequest;
use App\Http\Requests\Catalog\UpdateCategoryRequest;
use App\Http\Resources\Catalog\CategoryResource;
use App\Models\Category;
use App\Services\Catalog\CatalogCache;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Gate;

class CategoryController extends Controller
{
    /**
     * Cached: categories change rarely and every shop page reads them.
     * The cache is cleared by any create/update/delete below.
     */
    public function index(Request $request, CatalogCache $cache): JsonResponse
    {
        $isAdmin = $this->isAdmin($request);

        $payload = $cache->remember('categories', ['admin' => $isAdmin], function () use ($isAdmin) {
            $query = Category::orderBy('name');

            // Customers and guests only see active categories.
            if (! $isAdmin) {
                $query->where('is_active', true);
            }

            return CategoryResource::collection($query->get())->response()->getData(true);
        });

        return response()->json($payload);
    }

    public function show(Request $request, Category $category): CategoryResource
    {
        if (! $category->is_active && ! $this->isAdmin($request)) {
            abort(404);
        }

        $category->load(['parent', 'children']);

        return new CategoryResource($category);
    }

    public function store(StoreCategoryRequest $request, CatalogCache $cache): CategoryResource
    {
        $category = Category::create($request->validated());

        $cache->flush();

        return new CategoryResource($category);
    }

    public function update(UpdateCategoryRequest $request, Category $category, CatalogCache $cache): CategoryResource
    {
        $category->update($request->validated());

        $cache->flush();

        return new CategoryResource($category);
    }

    public function destroy(Category $category, CatalogCache $cache): Response|JsonResponse
    {
        Gate::authorize('delete', $category);

        if ($category->products()->exists() || $category->children()->exists()) {
            return response()->json([
                'message' => 'This category still has products or sub-categories. Move or delete them first.',
            ], 422);
        }

        $category->delete();

        $cache->flush();

        return response()->noContent();
    }
}
