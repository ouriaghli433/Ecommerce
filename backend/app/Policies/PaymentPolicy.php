<?php

namespace App\Policies;

use App\Models\Order;
use App\Models\Payment;
use App\Models\User;

class PaymentPolicy
{
    /**
     * Only the customer who owns the order can start paying it.
     * Called with the order: Gate::authorize('create', [Payment::class, $order])
     */
    public function create(User $user, Order $order): bool
    {
        return $order->user_id === $user->id;
    }

    /** The customer sees their own payments; an admin sees all of them. */
    public function view(User $user, Payment $payment): bool
    {
        return $user->isAdmin() || $payment->order->user_id === $user->id;
    }

    /** Refunds are started by admins only (or automatically by the system). */
    public function refund(User $user, Payment $payment): bool
    {
        return $user->isAdmin();
    }
}
