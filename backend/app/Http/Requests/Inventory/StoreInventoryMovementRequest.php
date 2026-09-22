<?php

namespace App\Http\Requests\Inventory;

use App\Models\Inventory;
use Illuminate\Foundation\Http\FormRequest;

class StoreInventoryMovementRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->can('update', Inventory::class);
    }

    public function rules(): array
    {
        $quantityRules = ['required', 'integer', 'not_in:0'];

        // purchase and return add stock, damage removes it, adjustment can do both.
        if (in_array($this->type, ['purchase', 'return'])) {
            $quantityRules[] = 'min:1';
        }

        if ($this->type === 'damage') {
            $quantityRules[] = 'max:-1';
        }

        return [
            // reservation, release and sale are created by checkout, never by hand.
            'type' => ['required', 'in:purchase,return,damage,adjustment'],
            'quantity' => $quantityRules,
            'reason' => ['nullable', 'string', 'max:255'],
        ];
    }
}
