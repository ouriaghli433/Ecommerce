<?php

namespace App\Http\Requests\ShippingPrice;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateShippingPriceRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $shippingPrice = $this->route('shipping_price');

        return [
            'city' => [
                'sometimes',
                'required',
                'string',
                'max:255',
                Rule::unique('shipping_prices', 'city')->ignore($shippingPrice),
            ],
            'cost' => 'sometimes|required|integer|min:0',
            'is_active' => 'sometimes|boolean',
        ];
    }
}
