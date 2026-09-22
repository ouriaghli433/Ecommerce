<?php

namespace App\Policies;

use App\Models\Coupon;
use App\Models\User;

// Coupons are managed by admins only.
// Customers will use a coupon code at checkout (TODO checkout).
class CouponPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->isAdmin();
    }

    public function view(User $user, Coupon $coupon): bool
    {
        return $user->isAdmin();
    }

    public function create(User $user): bool
    {
        return $user->isAdmin();
    }

    public function update(User $user, Coupon $coupon): bool
    {
        return $user->isAdmin();
    }

    public function delete(User $user, Coupon $coupon): bool
    {
        return $user->isAdmin();
    }
}
