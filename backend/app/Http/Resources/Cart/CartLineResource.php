<?php

namespace App\Http\Resources\Cart;

use App\Http\Resources\Catalog\ProductResource;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class CartLineResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'product_id' => $this->product_id,
            'product' => new ProductResource($this->whenLoaded('product')),
            'quantity' => $this->quantity,
            'unit_price' => $this->unit_price, // centimes, price when added
            'line_total' => $this->quantity * $this->unit_price,
        ];
    }
}
