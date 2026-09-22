<?php

namespace App\Http\Requests\Webhook;

use Illuminate\Foundation\Http\FormRequest;

class PaymentWebhookRequest extends FormRequest
{
    public function authorize(): bool
    {
        // The signature middleware already checked who is calling (RG36).
        return true;
    }

    public function rules(): array
    {
        return [
            'id' => ['required', 'string', 'max:255'],   // provider event id
            'type' => ['required', 'string', 'max:100'], // payment.succeeded, ...
            'data' => ['required', 'array'],
        ];
    }
}
