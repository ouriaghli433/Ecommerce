<?php

namespace App\Http\Requests\Catalog;

use Illuminate\Foundation\Http\FormRequest;

class UpdateProductImageRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->can('update', $this->route('product'));
    }

    public function rules(): array
    {
        return [
            'url' => ['sometimes', 'url', 'max:500'],
            'alt_text' => ['nullable', 'string', 'max:255'],
            'display_order' => ['sometimes', 'integer', 'min:0', 'max:1000'],
            'is_primary' => ['sometimes', 'boolean'],
        ];
    }
}
