<?php

namespace App\Services\Inventory;

use App\Models\InventoryMovement;
use App\Models\Product;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * The only place that changes stock, so every change creates a movement (RG10).
 * Checkout (reservation / release / sale) will reuse this class later.
 */
class InventoryService
{
    /**
     * Change on_hand for purchase, return, damage or adjustment movements.
     * $quantity is signed: +5 adds five units, -2 removes two.
     */
    public function changeOnHand(Product $product, string $type, int $quantity, ?string $reason, User $author): InventoryMovement
    {
        return DB::transaction(function () use ($product, $type, $quantity, $reason, $author) {
            // TODO(concurrency): lock the inventory row (lockForUpdate) so two
            // requests cannot change the same stock at the same time.
            $inventory = $product->inventory()->firstOrFail();

            $newOnHand = $inventory->on_hand + $quantity;

            // on_hand can never be negative or lower than reserved (RG9).
            if ($newOnHand < $inventory->reserved) {
                throw ValidationException::withMessages([
                    'quantity' => "Not enough stock: on hand {$inventory->on_hand}, reserved {$inventory->reserved}.",
                ]);
            }

            $inventory->update(['on_hand' => $newOnHand]);

            return $product->inventoryMovements()->create([
                'type' => $type,
                'quantity' => $quantity,
                'reason' => $reason,
                'created_by' => $author->id,
            ]);
        });
    }

    // TODO(checkout): reserve(), release() and sell() will live here.
    // They change `reserved` (RG11, RG12) and run inside the checkout / payment transactions.
}
