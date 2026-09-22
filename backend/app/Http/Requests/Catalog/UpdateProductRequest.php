<?php

namespace App\Http\Requests\Catalog;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateProductRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->can('update', $this->route('product'));
    }

    public function rules(): array
    {
        $product = $this->route('product');

        return [
            'name' => ['sometimes', 'string', 'max:150'],
            'slug' => ['sometimes', 'string', 'max:160', 'alpha_dash', Rule::unique('products', 'slug')->ignore($product->id)],
            'description' => ['nullable', 'string'],
            'sku' => ['sometimes', 'string', 'max:50', Rule::unique('products', 'sku')->ignore($product->id)],
            'price' => ['sometimes', 'integer', 'min:0'], // centimes
            'is_active' => ['sometimes', 'boolean'],
            'attributes' => ['nullable', 'array'],
            'category_id' => ['sometimes', 'uuid', 'exists:categories,id'],
        ];
    }
}
