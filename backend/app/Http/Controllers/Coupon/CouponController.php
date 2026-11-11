<?php

namespace App\Http\Controllers\Coupon;

use App\Http\Controllers\Controller;
use App\Http\Requests\Coupon\StoreCouponRequest;
use App\Http\Requests\Coupon\UpdateCouponRequest;
use App\Models\Coupon;

class CouponController extends Controller
{
    // Display all coupons
    public function index()
    {
        $coupons = Coupon::latest()->get();

        return response()->json([
            'coupons' => $coupons,
        ], 200);
    }

    // Create a coupon
    public function store(StoreCouponRequest $request)
    {
        $validated = $request->validated();

        // Save coupon code in uppercase
        $validated['code'] = strtoupper($validated['code']);

        $coupon = Coupon::create($validated);

        return response()->json([
            'message' => 'Coupon created successfully.',
            'coupon' => $coupon,
        ], 201);
    }

    // Display one coupon
    public function show(Coupon $coupon)
    {
        return response()->json([
            'coupon' => $coupon,
        ], 200);
    }

    // Update a coupon
    public function update(
        UpdateCouponRequest $request,
        Coupon $coupon
    ) {
        $validated = $request->validated();

        if (isset($validated['code'])) {
            $validated['code'] = strtoupper($validated['code']);
        }

        $coupon->update($validated);

        return response()->json([
            'message' => 'Coupon updated successfully.',
            'coupon' => $coupon,
        ], 200);
    }

    // Disable a coupon
    public function destroy(Coupon $coupon)
    {
        $coupon->update([
            'is_active' => false,
        ]);

        return response()->json([
            'message' => 'Coupon disabled successfully.',
        ], 200);
    }
}
