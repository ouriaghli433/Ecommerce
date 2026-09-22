<?php

namespace App\Http\Resources\Cart;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class CartResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $subtotal = 0;

        foreach ($this->lines as $line) {
            $subtotal += $line->quantity * $line->unit_price;
        }

        return [
            'id' => $this->id,
            'status' => $this->status,
            'lines' => CartLineResource::collection($this->lines),
            'subtotal' => $subtotal, // centimes, prices are re-checked at checkout
            'created_at' => $this->created_at,
        ];
    }
}
