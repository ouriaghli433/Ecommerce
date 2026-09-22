<?php

namespace App\Http\Resources\Catalog;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ProductResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'slug' => $this->slug,
            'description' => $this->description,
            'sku' => $this->sku,
            'price' => $this->price, // centimes
            'is_active' => $this->is_active,
            'attributes' => $this->attributes,
            'category_id' => $this->category_id,
            'category' => new CategoryResource($this->whenLoaded('category')),
            'available_stock' => $this->whenLoaded('inventory', fn () => $this->inventory?->availableStock()),
        ];
    }
}
