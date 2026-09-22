<?php

namespace App\Http\Requests\Catalog;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateCategoryRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->can('update', $this->route('category'));
    }

    public function rules(): array
    {
        $category = $this->route('category');

        return [
            'name' => ['sometimes', 'string', 'max:100'],
            'slug' => ['sometimes', 'string', 'max:120', 'alpha_dash', Rule::unique('categories', 'slug')->ignore($category->id)],
            'description' => ['nullable', 'string'],
            'is_active' => ['sometimes', 'boolean'],
            // A category cannot be its own parent.
            'parent_id' => ['nullable', 'uuid', 'exists:categories,id', Rule::notIn([$category->id])],
        ];
    }
}
