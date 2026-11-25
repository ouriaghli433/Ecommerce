<?php

namespace App\Http\Controllers\ProductImage;

use App\Http\Controllers\Controller;
use App\Http\Requests\ProductImage\StoreProductImageRequest;
use App\Http\Requests\ProductImage\UpdateProductImageRequest;
use App\Models\Product;
use Illuminate\Http\Request;

class ProductImageController extends Controller
{
    // Get all images of a product
    public function index(Product $product)
    {
        $images = $product->images()
            ->orderBy('display_order')
            ->get();

        return response()->json([
            'images' => $images,
        ], 200);
    }

    // Add an image to a product
    public function store(
        StoreProductImageRequest $request,
        Product $product
    ) {
        $validated = $request->validated();

        // Only one image can be primary for a product
        if ($request->boolean('is_primary')) {
            $product->images()->update([
                'is_primary' => false,
            ]);
        }

        $image = $product->images()->create($validated);

        return response()->json([
            'message' => 'Product image created successfully.',
            'image' => $image,
        ], 201);
    }

    // Get one image
    public function show(Product $product, string $image)
    {
        $productImage = $product->images()
            ->findOrFail($image);

        return response()->json([
            'image' => $productImage,
        ], 200);
    }

    // Update an image
    public function update(
        UpdateProductImageRequest $request,
        Product $product,
        string $image
    ) {
        $productImage = $product->images()
            ->findOrFail($image);

        $validated = $request->validated();

        // If this image becomes primary, unset the others
        if ($request->boolean('is_primary')) {
            $product->images()
                ->where('id', '!=', $productImage->id)
                ->update([
                    'is_primary' => false,
                ]);
        }

        $productImage->update($validated);

        return response()->json([
            'message' => 'Product image updated successfully.',
            'image' => $productImage,
        ], 200);
    }

    // Delete an image
    public function destroy(
        Product $product,
        string $image
    ) {
        $productImage = $product->images()
            ->findOrFail($image);

        $productImage->delete();

        return response()->json([
            'message' => 'Product image deleted successfully.',
        ], 200);
    }
}
