<?php

namespace App\Http\Requests\Product;

use Illuminate\Foundation\Http\FormRequest;

class StoreProductRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'name' => 'required|string|max:80',
            'slug' => 'required|string|max:120|unique:products,slug',
            'sku' => 'required|string|max:100|unique:products,sku',
            'price' => 'required|integer|gt:0',
            'description' => 'nullable|string',
            'is_active' => 'required|boolean',
            'attributes' => 'nullable|json',
            'category_id' => 'required|uuid|exists:categories,id'
        ];
    }
}
