<?php

namespace App\Http\Controllers\Category;

use App\Http\Controllers\Controller;
use App\Http\Requests\Category\StoreCategoryRequest;
use App\Http\Requests\Category\UpdateCategoryRequest;
use App\Models\Category;

class CategoryController extends Controller
{
    public function index()
    {
        $categories = Category::all();

        return response()->json([
            'categories' => $categories,
        ], 200);
    }

    public function store(StoreCategoryRequest $request)
    {
        $attributes = $request->validated();
        $category = Category::create($attributes);

        return response()->json([
            'category' => $category,
        ], 201);
    }

    public function show(Category $category)
    {

        return response()->json([
            'category' => $category,
        ], 200);
    }

    public function update(UpdateCategoryRequest $request, Category $category)
    {
        $attributes = $request->validated();
        $category->update($attributes);

        return response()->json([
            'category' => $category,
        ], 200);
    }

    public function destroy(Category $category)
    {
        $category->delete();

        return response()->json([
            'message' => 'Succesfully deleted!',
        ], 200);
    }
}
