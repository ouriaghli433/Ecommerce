<?php

namespace App\Http\Controllers\Order;

use App\Http\Controllers\Controller;
use App\Http\Requests\Order\CancelOrderRequest;
use App\Http\Requests\Order\UpdateOrderStatusRequest;
use App\Http\Resources\Order\OrderResource;
use App\Models\Order;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\ValidationException;

// TODO(checkout): orders are created by POST /api/checkout, not here.
class OrderController extends Controller
{
    /**
     * Customers get their own orders, admins get all. Filter: ?status=paid
     */
    public function index(Request $request): AnonymousResourceCollection
    {
        $query = Order::with('lines.product')->latest();

        if (! $request->user()->isAdmin()) {
            $query->where('user_id', $request->user()->id);
        }

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        return OrderResource::collection($query->paginate(15));
    }

    public function show(Order $order): OrderResource
    {
        Gate::authorize('view', $order);

        $order->load(['lines.product', 'coupon']);

        return new OrderResource($order);
    }

    public function cancel(CancelOrderRequest $request, Order $order): OrderResource
    {
        $wasPaid = in_array($order->status, ['paid', 'processing']);

        $order->update([
            'status' => 'cancelled',
            'cancelled_at' => now(),
            'cancel_reason' => $request->reason,
        ]);

        // TODO(checkout): release the reserved stock (RG12) with InventoryService.
        // TODO(payment): cancel any open provider payment.

        if ($wasPaid) {
            // TODO(refund): create a refund for the succeeded payment (RG25).
        }

        $order->load(['lines.product', 'coupon']);

        return new OrderResource($order);
    }

    public function updateStatus(UpdateOrderStatusRequest $request, Order $order): OrderResource
    {
        if (! $order->canTransitionTo($request->status)) {
            throw ValidationException::withMessages([
                'status' => "An order cannot go from {$order->status} to {$request->status}.",
            ]);
        }

        $order->update(['status' => $request->status]);

        $order->load(['lines.product', 'coupon']);

        return new OrderResource($order);
    }
}
