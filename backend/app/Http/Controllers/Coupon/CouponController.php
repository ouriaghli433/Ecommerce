<?php

namespace App\Http\Controllers\Coupon;

use App\Http\Controllers\Controller;
use App\Http\Requests\Coupon\StoreCouponRequest;
use App\Http\Requests\Coupon\UpdateCouponRequest;
use App\Http\Resources\Coupon\CouponResource;
use App\Models\Coupon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Gate;

// TODO(checkout): validating and applying a coupon to an order
// (RG38, RG39 with a lock on the coupon, RG40) happens at checkout.
class CouponController extends Controller
{
    public function index(): AnonymousResourceCollection
    {
        Gate::authorize('viewAny', Coupon::class);

        return CouponResource::collection(Coupon::orderBy('code')->paginate(15));
    }

    public function show(Coupon $coupon): CouponResource
    {
        Gate::authorize('view', $coupon);

        return new CouponResource($coupon);
    }

    public function store(StoreCouponRequest $request): CouponResource
    {
        $coupon = Coupon::create($request->validated());

        return new CouponResource($coupon);
    }

    public function update(UpdateCouponRequest $request, Coupon $coupon): CouponResource
    {
        $coupon->update($request->validated());

        return new CouponResource($coupon);
    }

    public function destroy(Coupon $coupon): Response|JsonResponse
    {
        Gate::authorize('delete', $coupon);

        if ($coupon->orders()->exists()) {
            return response()->json([
                'message' => 'This coupon was used in orders. Deactivate it instead.',
            ], 422);
        }

        $coupon->delete();

        return response()->noContent();
    }
}
