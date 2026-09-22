<?php

namespace App\Services\Coupon;

use App\Models\Coupon;
use App\Models\User;
use Illuminate\Validation\ValidationException;

/**
 * Coupon rules (RG38, RG39, RG40). The discount is always computed here,
 * on the server, never taken from the request.
 */
class CouponService
{
    /**
     * Find the coupon, lock its row, and check it can be used for this order.
     * Must run inside the checkout transaction: the lock is what stops two
     * customers from using the last remaining coupon at the same time.
     */
    public function lockAndValidate(string $code, User $user, int $subtotal): Coupon
    {
        $coupon = Coupon::where('code', $code)->lockForUpdate()->first();

        if (! $coupon) {
            $this->fail('This coupon code does not exist.');
        }

        if (! $coupon->is_active) {
            $this->fail('This coupon is not active.');
        }

        $now = now();

        if ($coupon->starts_at && $now->lt($coupon->starts_at)) {
            $this->fail('This coupon is not valid yet.');
        }

        if ($coupon->expires_at && $now->gt($coupon->expires_at)) {
            $this->fail('This coupon has expired.');
        }

        if ($subtotal < $coupon->min_order_amount) {
            $this->fail("This coupon needs a minimum order of {$coupon->min_order_amount} centimes.");
        }

        // Usage limits (RG39). Orders that were cancelled or expired do not count.
        $usedOrders = $coupon->orders()->whereNotIn('status', ['cancelled', 'expired']);

        if ($coupon->max_usage !== null && $usedOrders->clone()->count() >= $coupon->max_usage) {
            $this->fail('This coupon has reached its usage limit.');
        }

        if ($coupon->per_user_limit !== null
            && $usedOrders->clone()->where('user_id', $user->id)->count() >= $coupon->per_user_limit) {
            $this->fail('You have already used this coupon.');
        }

        return $coupon;
    }

    /**
     * Percent coupons take a share of the subtotal, fixed coupons take an amount.
     * The discount never goes above the subtotal, so the order can not be negative.
     */
    public function discountFor(Coupon $coupon, int $subtotal): int
    {
        $discount = $coupon->type === 'percent'
            ? (int) floor($subtotal * $coupon->value / 100)
            : $coupon->value;

        return min($discount, $subtotal);
    }

    private function fail(string $message): never
    {
        throw ValidationException::withMessages(['coupon_code' => $message]);
    }
}
