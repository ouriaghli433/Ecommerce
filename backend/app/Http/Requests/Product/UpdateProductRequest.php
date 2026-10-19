<?php

namespace App\Http\Requests\Product;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateProductRequest extends FormRequest
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
            'name' => 'sometimes|string|max:80',
            'slug' => ['sometimes','string','max:120', Rule::unique('products', 'slug')->ignore($this->product)],
            'sku' => ['sometimes','string','max:100', Rule::unique('products', 'sku')->ignore($this->product)],
            'price' => 'sometimes|integer|gt:0',
            'description' => 'nullable|string',
            'is_active' => 'sometimes|boolean',
            'attributes' => 'nullable|json',
            'category_id' => 'sometimes|uuid|exists:categories,id'
        ];
    }
}
