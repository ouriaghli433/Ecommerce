<?php

namespace App\Http\Requests\Category;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateCategoryRequest extends FormRequest
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
            'name' => 'sometimes|string|max:50',
            'slug' => [
                'sometimes',
                'string',
                'max:500',
                Rule::unique('categories', 'slug')->ignore($this->category),
            ],
            'description' => 'nullable|string',
            'is_active' => 'sometimes|boolean',
        ];
    }
}
