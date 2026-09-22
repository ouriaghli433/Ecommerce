<?php

namespace App\Http\Requests\Catalog;

use App\Models\Category;
use Illuminate\Foundation\Http\FormRequest;

class StoreCategoryRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->can('create', Category::class);
    }

    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:100'],
            'slug' => ['required', 'string', 'max:120', 'alpha_dash', 'unique:categories,slug'],
            'description' => ['nullable', 'string'],
            'is_active' => ['sometimes', 'boolean'],
            'parent_id' => ['nullable', 'uuid', 'exists:categories,id'],
        ];
    }
}
