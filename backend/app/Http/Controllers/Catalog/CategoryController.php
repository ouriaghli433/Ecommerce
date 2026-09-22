<?php

namespace App\Http\Controllers\Catalog;

use App\Http\Controllers\Controller;
use App\Http\Requests\Catalog\StoreCategoryRequest;
use App\Http\Requests\Catalog\UpdateCategoryRequest;
use App\Http\Resources\Catalog\CategoryResource;
use App\Models\Category;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Gate;

class CategoryController extends Controller
{
    public function index(Request $request): AnonymousResourceCollection
    {
        $query = Category::orderBy('name');

        // Customers and guests only see active categories.
        if (! $this->isAdmin($request)) {
            $query->where('is_active', true);
        }

        return CategoryResource::collection($query->get());
    }

    public function show(Request $request, Category $category): CategoryResource
    {
        if (! $category->is_active && ! $this->isAdmin($request)) {
            abort(404);
        }

        $category->load(['parent', 'children']);

        return new CategoryResource($category);
    }

    public function store(StoreCategoryRequest $request): CategoryResource
    {
        $category = Category::create($request->validated());

        return new CategoryResource($category);
    }

    public function update(UpdateCategoryRequest $request, Category $category): CategoryResource
    {
        $category->update($request->validated());

        return new CategoryResource($category);
    }

    public function destroy(Category $category): Response|JsonResponse
    {
        Gate::authorize('delete', $category);

        if ($category->products()->exists() || $category->children()->exists()) {
            return response()->json([
                'message' => 'This category still has products or sub-categories. Move or delete them first.',
            ], 422);
        }

        $category->delete();

        return response()->noContent();
    }
}
