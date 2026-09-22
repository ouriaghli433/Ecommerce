<?php

namespace App\Http\Requests\Coupon;

use App\Models\Coupon;
use Illuminate\Foundation\Http\FormRequest;

class StoreCouponRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->can('create', Coupon::class);
    }

    public function rules(): array
    {
        $valueRules = ['required', 'integer', 'min:1'];

        // A percent coupon goes from 1 to 100. A fixed one is an amount in centimes.
        if ($this->type === 'percent') {
            $valueRules[] = 'max:100';
        }

        return [
            'code' => ['required', 'string', 'max:50', 'alpha_dash', 'unique:coupons,code'],
            'type' => ['required', 'in:percent,fixed'],
            'value' => $valueRules,
            'min_order_amount' => ['sometimes', 'integer', 'min:0'],
            'max_usage' => ['nullable', 'integer', 'min:1'],       // null = unlimited
            'per_user_limit' => ['nullable', 'integer', 'min:1'],  // null = unlimited
            'starts_at' => ['nullable', 'date'],
            'expires_at' => ['nullable', 'date', 'after:starts_at'],
            'is_active' => ['sometimes', 'boolean'],
        ];
    }
}
