<?php

namespace App\Http\Requests\ShippingPrice;

use Illuminate\Foundation\Http\FormRequest;

class StoreShippingPriceRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'city' => 'required|string|max:255|unique:shipping_prices,city',
            'cost' => 'required|integer|min:0',
            'is_active' => 'sometimes|boolean',
        ];
    }
}
