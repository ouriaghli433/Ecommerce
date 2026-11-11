<?php

namespace App\Http\Requests\ProductImage;

use Illuminate\Foundation\Http\FormRequest;

class StoreProductImageRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'image_url' => ['required', 'url', 'max:2048'],
            'alt_text' => ['nullable', 'string', 'max:255'],
            'display_order' => ['sometimes', 'integer', 'min:0'],
            'is_primary' => ['sometimes', 'boolean'],
        ];
    }
}
