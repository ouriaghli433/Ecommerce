<?php

namespace App\Http\Resources\Order;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class OrderResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'user_id' => $this->user_id,
            'status' => $this->status,

            // amounts in centimes
            'subtotal' => $this->subtotal,
            'discount_amount' => $this->discount_amount,
            'shipping_amount' => $this->shipping_amount,
            'tax_amount' => $this->tax_amount,
            'total_amount' => $this->total_amount,
            'currency' => $this->currency,
            'coupon_code' => $this->whenLoaded('coupon', fn () => $this->coupon?->code),

            // copy of the delivery address taken at checkout (RG19)
            'shipping_address' => [
                'full_name' => $this->shipping_full_name,
                'phone' => $this->shipping_phone,
                'address_line' => $this->shipping_address_line,
                'city' => $this->shipping_city,
                'postal_code' => $this->shipping_postal_code,
                'country' => $this->shipping_country,
            ],

            'lines' => OrderLineResource::collection($this->whenLoaded('lines')),

            'expires_at' => $this->expires_at,
            'paid_at' => $this->paid_at,
            'cancelled_at' => $this->cancelled_at,
            'cancel_reason' => $this->cancel_reason,
            'created_at' => $this->created_at,
        ];
    }
}
