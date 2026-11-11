<?php

namespace App\Http\Controllers\Order;

use App\Http\Controllers\Controller;
use App\Http\Requests\Order\UpdateOrderStatusRequest;
use App\Models\Order;

class OrderController extends Controller
{
    // Get all orders
    public function index()
    {
        $orders = Order::with('user')
            ->latest()
            ->paginate(15);

        return response()->json($orders);
    }

    // Get order details
    public function show(string $order)
    {
        $order = Order::with([
            'user',
            'orderLines.product',
            'payments',
            'coupon',
        ])->findOrFail($order);

        return response()->json($order);
    }

    // Update order status
    public function update(
        UpdateOrderStatusRequest $request,
        string $order
    ) {
        $order = Order::findOrFail($order);

        // Allowed status transitions
        $allowedTransitions = [
            'paid' => ['processing'],
            'processing' => ['shipped'],
            'shipped' => ['delivered'],
        ];

        $newStatus = $request->validated()['status'];

        $allowedStatuses = $allowedTransitions[$order->status] ?? [];

        if (!in_array($newStatus, $allowedStatuses)) {
            return response()->json([
                'message' => 'This status transition is not allowed.',
            ], 422);
        }

        $order->update([
            'status' => $newStatus,
        ]);

        return response()->json([
            'message' => 'Order status updated successfully.',
            'order' => $order,
        ]);
    }
}
