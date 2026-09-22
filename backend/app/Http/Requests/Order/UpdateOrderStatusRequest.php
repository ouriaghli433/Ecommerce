<?php

namespace App\Http\Requests\Order;

use Illuminate\Foundation\Http\FormRequest;

class UpdateOrderStatusRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->can('updateStatus', $this->route('order'));
    }

    public function rules(): array
    {
        return [
            // paid comes from a verified payment and expired from the expiration job,
            // cancelled has its own endpoint. So an admin can only move an order forward.
            'status' => ['required', 'in:processing,shipped,delivered'],
        ];
    }
}
