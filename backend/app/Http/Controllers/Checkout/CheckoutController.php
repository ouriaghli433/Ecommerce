<?php

namespace App\Http\Controllers\Checkout;

use App\Http\Controllers\Controller;
use App\Http\Requests\Checkout\CheckoutRequest;
use App\Http\Resources\Order\OrderResource;
use App\Models\Address;
use App\Services\Checkout\CheckoutService;
use Illuminate\Http\JsonResponse;

class CheckoutController extends Controller
{
    /**
     * POST /api/checkout - turn the active cart into an order.
     * All the work is in CheckoutService; the controller only passes data.
     */
    public function store(CheckoutRequest $request, CheckoutService $checkout): JsonResponse
    {
        $address = Address::findOrFail($request->address_id);

        $order = $checkout->checkout($request->user(), $address, $request->coupon_code);

        return (new OrderResource($order))->response()->setStatusCode(201);
    }
}
