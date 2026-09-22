<?php

namespace App\Http\Resources\Inventory;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class InventoryResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'product_id' => $this->product_id,
            'on_hand' => $this->on_hand,
            'reserved' => $this->reserved,
            'available' => $this->availableStock(),
            'updated_at' => $this->updated_at,
        ];
    }
}
