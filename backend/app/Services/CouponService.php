<?php

namespace App\Services;

use App\Models\Coupon;
use App\Models\Order;
use App\Models\User;
use Illuminate\Validation\ValidationException;

class CouponService
{
    public function applyCoupon(
        string $code,
        User $user,
        int $subTotal,
        int $shippingCost = 0
    ): array {
        // Find coupon
        $coupon = Coupon::where('code', $code)->first();

        if (!$coupon) {
            $this->fail('This coupon code does not exist.');
        }

        // Check if coupon is active
        if (!$coupon->is_active) {
            $this->fail('This coupon is not active.');
        }

        // Check start date
        if ($coupon->starts_at && now()->lt($coupon->starts_at)) {  // now()->lt() = now is less than
            $this->fail('This coupon is not available yet.');
        }

        // Check expiration date
        if ($coupon->expires_at && now()->gt($coupon->expires_at)) { // now()->gt() = now is greater than
            $this->fail('This coupon has expired.');
        }

        // Check minimum order amount
        if ($subTotal < $coupon->min_order_amount) {
            $this->fail(
                'Your order does not meet the minimum amount for this coupon.'
            );
        }

        // Check global usage limit
        if ($coupon->max_usage !== null) {
            // count all orders has used this coupon code before 
            $globalUsageCount = Order::where('coupon_id', $coupon->id)
                ->whereIn('status', [
                    'paid',
                    'processing',
                    'shipped',
                    'delivered',
                ])
                ->count();

            if ($globalUsageCount >= $coupon->max_usage) {
                $this->fail('This coupon has reached its usage limit.');
            }
        }

        // Check per-user usage limit
        if ($coupon->per_user_limit !== null) {
            // count user orders has used this coupon code before 
            $userUsageCount = Order::where('user_id', $user->id)
                ->where('coupon_id', $coupon->id)
                ->whereIn('status', [
                    'paid',
                    'processing',
                    'shipped',
                    'delivered',
                ])
                ->count();

            if ($userUsageCount >= $coupon->per_user_limit) {
                $this->fail(
                    'You have already used this coupon the maximum number of times.'
                );
            }
        }

        // Calculate discount
        if ($coupon->type === 'percent') {
            // Example: value = 10 means 10%
            $discount = (int) round(
                $subTotal * $coupon->value / 100 // round the percentage discount to the nearest integer (centime)
            );
        } else {
            // Fixed value is stored in centimes
            $discount = $coupon->value;
        }

        // Discount cannot exceed subtotal -- subtotal cant be negative 
        // min() return the minimum of two inputs 
        $discount = min($discount, $subTotal);

        // Calculate new total
        $total = $subTotal + $shippingCost - $discount; 
        return [
            'couponId' => $coupon->id,
            'coupon' => $coupon,
            'subtotal' => $subTotal,
            'discount' => $discount,
            'shipping_cost' => $shippingCost,
            'total' => $total,
        ];
    }

    private function fail(string $message): never
    {
        throw ValidationException::withMessages([
            'coupon_code' => [$message],
        ]);
    }
}