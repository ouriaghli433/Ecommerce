<?php

namespace App\Http\Controllers\Payment;

use App\Http\Controllers\Controller;
use App\Http\Resources\Payment\PaymentResource;
use App\Models\Order;
use App\Models\Payment;
use App\Services\Payment\PaymentService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\Gate;

class PaymentController extends Controller
{
    /**
     * POST /api/orders/{order}/payments - start paying an order.
     * The answer contains the checkout URL of the provider. The payment only
     * becomes "succeeded" later, when the provider sends its webhook (RG32).
     */
    public function store(Order $order, PaymentService $payments): JsonResponse
    {
        Gate::authorize('create', [Payment::class, $order]);

        $result = $payments->start($order);

        return response()->json([
            'payment' => new PaymentResource($result['payment']),
            'checkout_url' => $result['checkout_url'],
        ], 201);
    }

    /** GET /api/orders/{order}/payments - the payment attempts of an order. */
    public function index(Order $order): AnonymousResourceCollection
    {
        Gate::authorize('view', $order);

        return PaymentResource::collection($order->payments()->get());
    }

    /** GET /api/payments/{payment} */
    public function show(Payment $payment): PaymentResource
    {
        Gate::authorize('view', $payment);

        return new PaymentResource($payment);
    }
}
