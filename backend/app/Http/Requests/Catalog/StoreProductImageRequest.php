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

    /**
     * A picture arrives in one of two ways:
     * - "file": chosen from the computer (what the admin normally does);
     * - "url": an address on the internet (used by the demo data).
     *
     * required_without means: one of the two must be there.
     */
    public function rules(): array
    {
        return [
            'file' => [
                'required_without:url',
                'image',
                'mimes:jpeg,jpg,png,webp,avif',
                'max:4096', // kilobytes, so 4 MB
            ],
            'url' => ['required_without:file', 'url', 'max:500'],
            'alt_text' => ['nullable', 'string', 'max:255'],
            'display_order' => ['sometimes', 'integer', 'min:0', 'max:1000'],
            'is_primary' => ['sometimes', 'boolean'],
        ];
    }

    public function messages(): array
    {
        return [
            'file.required_without' => 'Choose a picture from your computer, or give its address.',
            'file.image' => 'That file is not a picture.',
            'file.mimes' => 'The picture must be a JPG, PNG, WEBP or AVIF file.',
            'file.max' => 'The picture must be smaller than 4 MB.',
            'url.required_without' => 'Choose a picture from your computer, or give its address.',
            'url.url' => 'The picture address must be a full link, for example https://…/photo.jpg',
        ];
    }
}
