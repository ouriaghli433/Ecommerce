<?php

namespace App\Http\Requests\Coupon;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateCouponRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'code' => [
                'sometimes',
                'required',
                'string',
                'max:50',
                Rule::unique('coupons', 'code')->ignore($this->route('coupon')),
            ],
            'type' => ['sometimes', 'required', 'in:percent,fixed'],
            'value' => ['sometimes', 'required', 'integer', 'min:1'],
            'min_order_amount' => ['sometimes', 'required', 'integer', 'min:0'],
            'max_usage' => ['sometimes', 'nullable', 'integer', 'min:1'],
            'per_user_limit' => ['sometimes', 'nullable', 'integer', 'min:1'],
            'starts_at' => ['sometimes', 'nullable', 'date'],
            'expires_at' => ['sometimes', 'nullable', 'date'],
            'is_active' => ['sometimes', 'boolean'],
        ];
    }
}
