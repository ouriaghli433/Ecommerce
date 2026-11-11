<?php

namespace App\Http\Controllers\ShippingPrice;

use App\Http\Controllers\Controller;
use App\Http\Requests\ShippingPrice\StoreShippingPriceRequest;
use App\Http\Requests\ShippingPrice\UpdateShippingPriceRequest;
use App\Models\ShippingPrice;

class ShippingPriceController extends Controller
{
    // Get all shipping prices
    public function index()
    {
        $shippingPrices = ShippingPrice::latest()->paginate(15);

        return response()->json($shippingPrices);
    }

    // Create shipping price
    public function store(StoreShippingPriceRequest $request)
    {
        $shippingPrice = ShippingPrice::create($request->validated());

        return response()->json([
            'message' => 'Shipping price created successfully.',
            'shipping_price' => $shippingPrice,
        ], 201);
    }

    // Get one shipping price
    public function show(string $shipping_price)
    {
        $shippingPrice = ShippingPrice::findOrFail($shipping_price);

        return response()->json($shippingPrice);
    }

    // Update shipping price
    public function update(
        UpdateShippingPriceRequest $request,
        string $shipping_price
    ) {
        $shippingPrice = ShippingPrice::findOrFail($shipping_price);

        $shippingPrice->update($request->validated());

        return response()->json([
            'message' => 'Shipping price updated successfully.',
            'shipping_price' => $shippingPrice,
        ]);
    }

    // Disable shipping price instead of deleting it
    public function destroy(string $shipping_price)
    {
        $shippingPrice = ShippingPrice::findOrFail($shipping_price);

        $shippingPrice->update([
            'is_active' => false,
        ]);

        return response()->json([
            'message' => 'Shipping price disabled successfully.',
        ]);
    }
}
