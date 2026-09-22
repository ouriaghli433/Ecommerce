<?php

namespace App\Http\Resources\Payment;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class PaymentResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'order_id' => $this->order_id,
            'status' => $this->status,
            'amount' => $this->amount, // centimes
            'currency' => $this->currency,
            'provider' => $this->provider,
            'provider_ref' => $this->provider_ref,
            'failure_reason' => $this->failure_reason,
            'succeeded_at' => $this->succeeded_at,
        ];
    }
}
