<?php

namespace App\Http\Requests\Checkout;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class CheckoutRequest extends FormRequest
{
    public function authorize(): bool
    {
        // Any logged-in customer can check out their own cart.
        return true;
    }

    public function rules(): array
    {
        return [
            // The address must exist AND belong to the customer checking out.
            'address_id' => [
                'required',
                'uuid',
                Rule::exists('addresses', 'id')->where('user_id', $this->user()->id),
            ],
            // Checked in detail by CouponService (dates, limits, minimum amount).
            'coupon_code' => ['nullable', 'string', 'max:50'],
        ];
    }

    public function messages(): array
    {
        return [
            'address_id.exists' => 'This delivery address does not belong to you.',
        ];
    }
}
