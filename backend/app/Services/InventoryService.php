<?php

namespace App\Services;

use App\Models\Inventory;
use App\Models\InventoryMovement;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class InventoryService
{
    public function recordMovement(
        Inventory $inventory,
        string $type,
        int $quantity,
        ?string $reason = null,
        ?string $referenceType = null,
        ?string $referenceId = null,
        ?string $createdBy = null,
    ): InventoryMovement {
        return DB::transaction(function () use (
            $inventory,
            $type,
            $quantity,
            $reason,
            $referenceType,
            $referenceId,
            $createdBy
        ) {

            $inventory = Inventory::query()
                ->lockForUpdate()
                ->findOrFail($inventory->id);
            
            // to define the sign of quantity, increase + or decreased -
            $movementQuantity = match ($type) {
                'purchase', 'return', 'reservation' => $quantity,
                'damage', 'sale', 'release' => -$quantity,
                'adjustment' => throw ValidationException::withMessages([
                    'type' => 'Adjustment requires a dedicated operation.',
                ]),
                default => throw ValidationException::withMessages([
                    'type' => 'Unsupported movement type.',
                ]),
            };

            // Update the inventory stock quantities based on the movement type.
            $this->updateInventory($inventory, $type, $quantity);

            $inventory->save();
            
            return $inventory->movements()->create([
                'movement_type' => $type,
                'quantity' => $movementQuantity,
                'reason' => $reason,
                'reference_type' => $referenceType,
                'reference_id' => $referenceId,
                'created_by' => $createdBy,
            ]);

        });
    }

    private function updateInventory(
        Inventory $inventory,
        string $type,
        int $quantity
    ): void {
        // Adjustment can be positive or negative.
        if ($type === 'adjustment') {
            if ($quantity === 0) {
                throw ValidationException::withMessages([
                    'quantity' => 'Adjustment quantity cannot be zero.',
                ]);
            }

            if ($inventory->on_hand + $quantity < $inventory->reserved) {
                throw ValidationException::withMessages([
                    'quantity' => 'Adjustment cannot reduce stock below reserved quantity.',
                ]);
            }

            $inventory->on_hand += $quantity;

            return;
        }

        if ($quantity <= 0) {
            throw ValidationException::withMessages([
                'quantity' => 'Quantity must be greater than 0',
            ]);
        }
        switch ($type) {
            case 'purchase':
            case 'return' :
                $inventory->on_hand += $quantity;
                break;

            case 'damage':
                if ($inventory->on_hand - $inventory->reserved < $quantity) {
                    throw ValidationException::withMessages([
                        'quantity' => 'insufficiant available stock',
                    ]);
                }
                $inventory->on_hand -= $quantity;
                break;

            case 'release':
                if ($inventory->reserved < $quantity) {
                    throw ValidationException::withMessages([
                        'quantity' => 'Not enough reserved stock',
                    ]);
                }
                $inventory->reserved -= $quantity;
                break;

            case 'sale':
                if ($inventory->reserved < $quantity) {
                    throw ValidationException::withMessages([
                        'quantity' => 'Not enough reserved stock',
                    ]);
                }
                $inventory->reserved -= $quantity;
                $inventory->on_hand -= $quantity;
                break;

            case 'reservation' :
                if ($inventory->on_hand - $inventory->reserved < $quantity) {
                    throw ValidationException::withMessages([
                        'quantity' => 'Insufficient available stock',
                    ]);
                }
                $inventory->reserved += $quantity;
                break;
            default:
                throw ValidationException::withMessages([
                    'type' => 'unsupported movement type',
                ]);
        }
    }
}
