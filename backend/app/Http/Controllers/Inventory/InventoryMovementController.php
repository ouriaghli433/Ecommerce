<?php

namespace App\Http\Controllers\Inventory;

use App\Http\Controllers\Controller;
use App\Models\Inventory;
use App\Models\InventoryMovement;
use App\Services\InventoryService;
use Illuminate\Http\Request;

class InventoryMovementController extends Controller
{
    public function index()
    {
        $movements = InventoryMovement::with('inventory')->get();

        return response()->json($movements);
    }

    public function show(InventoryMovement $inventoryMovement)
    {
        $inventoryMovement->load('inventory');

        return response()->json($inventoryMovement);
    }
     
    public function store(Request $request, InventoryService $service)
    {
        $data = $request->validate([
            'inventory_id' => 'required|uuid|exists:inventories,id',
            'type' => 'required|in:purchase,return,damage,reservation,release,sale,adjustment',
            'quantity' => 'required|integer',
            'reason' => 'nullable|string',
        ]);

        if ($data['type'] === 'adjustment') {
            if ($data['quantity'] == 0) {
                return response()->json([
                    'message' => 'Adjustment quantity cannot be zero.',
                ], 422);
            }

            if (empty($data['reason'])) {
                return response()->json([
                    'message' => 'Reason is required for adjustment.',
                ], 422);
            }
        } else {
            if ($data['quantity'] <= 0) {
                return response()->json([
                    'message' => 'Quantity must be greater than zero.',
                ], 422);
            }
        }

        $inventory = Inventory::findOrFail($data['inventory_id']);

        $movement = $service->recordMovement(
            $inventory,
            $data['type'],
            $data['quantity'],
            $data['reason'] ?? null,
            createdBy: $request->user()->id
        );

        return response()->json([
            'movement' => $movement,
        ], 201);
    }


}
