<?php

namespace App\Http\Requests\Coupon;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateCouponRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->can('update', $this->route('coupon'));
    }

    public function rules(): array
    {
        $coupon = $this->route('coupon');

        // Use the new type if it is sent, otherwise the current one.
        $type = $this->input('type', $coupon->type);

        $valueRules = ['sometimes', 'integer', 'min:1'];

        if ($type === 'percent') {
            $valueRules[] = 'max:100';
        }

        return [
            'code' => ['sometimes', 'string', 'max:50', 'alpha_dash', Rule::unique('coupons', 'code')->ignore($coupon->id)],
            'type' => ['sometimes', 'in:percent,fixed'],
            'value' => $valueRules,
            'min_order_amount' => ['sometimes', 'integer', 'min:0'],
            'max_usage' => ['nullable', 'integer', 'min:1'],
            'per_user_limit' => ['nullable', 'integer', 'min:1'],
            'starts_at' => ['nullable', 'date'],
            'expires_at' => ['nullable', 'date', 'after:starts_at'],
            'is_active' => ['sometimes', 'boolean'],
        ];
    }
}
