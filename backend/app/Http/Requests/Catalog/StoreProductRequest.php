<?php

namespace App\Http\Requests\Catalog;

use App\Models\Product;
use Illuminate\Foundation\Http\FormRequest;

class StoreProductRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->can('create', Product::class);
    }

    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:150'],
            'slug' => ['required', 'string', 'max:160', 'alpha_dash', 'unique:products,slug'],
            'description' => ['nullable', 'string'],
            'sku' => ['required', 'string', 'max:50', 'unique:products,sku'],
            'price' => ['required', 'integer', 'min:0'], // centimes
            'is_active' => ['sometimes', 'boolean'],
            'attributes' => ['nullable', 'array'],
            'category_id' => ['required', 'uuid', 'exists:categories,id'],
        ];
    }
}
