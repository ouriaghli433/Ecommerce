<?php

namespace App\Policies;

use App\Models\Order;
use App\Models\User;

class OrderPolicy
{
    // Customers see their own orders, admins see all of them.
    public function view(User $user, Order $order): bool
    {
        return $user->isAdmin() || $order->user_id === $user->id;
    }

    /**
     * RG25: a customer can cancel a pending_payment or paid order.
     * An admin can also cancel a processing order.
     */
    public function cancel(User $user, Order $order): bool
    {
        if ($user->isAdmin()) {
            return in_array($order->status, ['pending_payment', 'paid', 'processing']);
        }

        return $order->user_id === $user->id
            && in_array($order->status, ['pending_payment', 'paid']);
    }

    // Moving an order forward (processing, shipped, delivered) is for admins.
    public function updateStatus(User $user, Order $order): bool
    {
        return $user->isAdmin();
    }
}
