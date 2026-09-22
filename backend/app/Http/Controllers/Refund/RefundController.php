<?php

namespace App\Http\Controllers\Refund;

use App\Http\Controllers\Controller;
use App\Http\Requests\Refund\StoreRefundRequest;
use App\Http\Resources\Refund\RefundResource;
use App\Models\Payment;
use App\Services\Refund\RefundService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\Gate;

class RefundController extends Controller
{
    /** GET /api/payments/{payment}/refunds */
    public function index(Payment $payment): AnonymousResourceCollection
    {
        Gate::authorize('view', $payment);

        return RefundResource::collection($payment->refunds()->get());
    }

    /** POST /api/payments/{payment}/refunds - admin refunds a payment. */
    public function store(StoreRefundRequest $request, Payment $payment, RefundService $refunds): JsonResponse
    {
        $refund = $refunds->create(
            $payment,
            $request->integer('amount'),
            $request->reason,
            $request->user(),
        );

        return (new RefundResource($refund))->response()->setStatusCode(201);
    }
}
