<?php

namespace App\Services\Inventory;

use App\Models\Inventory;
use App\Models\InventoryMovement;
use App\Models\Order;
use App\Models\Product;
use App\Models\User;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * The only place that changes stock, so every change creates a movement (RG10).
 *
 * Two groups of methods:
 * - changeOnHand(): used by the admin endpoints, opens its own transaction.
 * - lockInventories() / reserve() / release() / sell(): used by checkout,
 *   payment and expiration. They must run inside a transaction opened by the
 *   caller, on rows the caller has already locked.
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
            // lockForUpdate() makes other transactions wait here until this one
            // finishes, so two admins cannot compute on_hand from the same old value.
            $inventory = $product->inventory()->lockForUpdate()->firstOrFail();

            $newOnHand = $inventory->on_hand + $quantity;

            // on_hand can never be negative or lower than reserved (RG9).
            if ($newOnHand < $inventory->reserved) {
                throw ValidationException::withMessages([
                    'quantity' => "Not enough stock: on hand {$inventory->on_hand}, reserved {$inventory->reserved}.",
                ]);
            }

            $inventory->update(['on_hand' => $newOnHand]);

            return $this->recordMovement($inventory, $type, $quantity, $reason, null, $author?->id);
        });
    }

    /**
     * Lock the inventory rows of several products at once.
     *
     * The order by product_id matters: when two checkouts want the same two
     * products, both lock them in the same order, so they queue instead of
     * waiting for each other in a deadlock.
     *
     * @param  array<int, string>  $productIds
     * @return Collection<string, Inventory> keyed by product_id
     */
    public function lockInventories(array $productIds): Collection
    {
        sort($productIds);

        return Inventory::whereIn('product_id', $productIds)
            ->orderBy('product_id')
            ->lockForUpdate()
            ->get()
            ->keyBy('product_id');
    }

    /**
     * Hold stock for an order waiting for payment (RG11).
     * Only `reserved` changes; the units are still in the warehouse.
     */
    public function reserve(Inventory $inventory, int $quantity, Order $order): InventoryMovement
    {
        $inventory->update(['reserved' => $inventory->reserved + $quantity]);

        return $this->recordMovement($inventory, 'reservation', $quantity, 'Checkout', $order);
    }

    /**
     * Give reserved stock back when an order is cancelled or expires (RG12).
     */
    public function release(Inventory $inventory, int $quantity, Order $order, ?string $reason = null): InventoryMovement
    {
        $inventory->update(['reserved' => max(0, $inventory->reserved - $quantity)]);

        return $this->recordMovement($inventory, 'release', -$quantity, $reason ?? 'Order released', $order);
    }

    /**
     * Turn a reservation into a real sale when the payment succeeds (RG11).
     * The units leave the warehouse: on_hand and reserved both go down.
     */
    public function sell(Inventory $inventory, int $quantity, Order $order): InventoryMovement
    {
        $inventory->update([
            'on_hand' => $inventory->on_hand - $quantity,
            'reserved' => max(0, $inventory->reserved - $quantity),
        ]);

        return $this->recordMovement($inventory, 'sale', -$quantity, 'Payment succeeded', $order);
    }

    /**
     * Write the audit line for a stock change (RG10).
     */
    private function recordMovement(Inventory $inventory, string $type, int $quantity, ?string $reason, ?Order $order = null, ?string $authorId = null): InventoryMovement
    {
        return InventoryMovement::create([
            'product_id' => $inventory->product_id,
            'type' => $type,
            'quantity' => $quantity,
            'reason' => $reason,
            'reference_type' => $order ? Order::class : null,
            'reference_id' => $order?->id,
            'created_by' => $authorId,
        ]);
    }
}
