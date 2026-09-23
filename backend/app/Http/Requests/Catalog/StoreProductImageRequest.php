<?php

namespace App\Http\Requests\Catalog;

use Illuminate\Foundation\Http\FormRequest;

class StoreProductImageRequest extends FormRequest
{
    public function authorize(): bool
    {
        // Same right as editing the product itself.
        return $this->user()->can('update', $this->route('product'));
    }

    public function rules(): array
    {
        return [
            'url' => ['required', 'url', 'max:500'],
            'alt_text' => ['nullable', 'string', 'max:255'],
            'display_order' => ['sometimes', 'integer', 'min:0', 'max:1000'],
            'is_primary' => ['sometimes', 'boolean'],
        ];
    }

    public function messages(): array
    {
        return [
            'url.url' => 'The picture address must be a full link, for example https://…/photo.jpg',
        ];
    }
}
