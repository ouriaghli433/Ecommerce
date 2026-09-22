<?php

namespace App\Http\Resources\Refund;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class RefundResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'payment_id' => $this->payment_id,
            'amount' => $this->amount, // centimes
            'status' => $this->status,
            'reason' => $this->reason,
            'provider_ref' => $this->provider_ref,
            'created_by' => $this->created_by,
        ];
    }
}
