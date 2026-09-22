<?php

namespace App\Http\Requests\Refund;

use Illuminate\Foundation\Http\FormRequest;

class StoreRefundRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->can('refund', $this->route('payment'));
    }

    public function rules(): array
    {
        return [
            'amount' => ['required', 'integer', 'min:1'], // centimes
            // late_payment is created by the system only (RG30).
            'reason' => ['required', 'in:order_cancelled,customer_request,admin'],
        ];
    }
}
