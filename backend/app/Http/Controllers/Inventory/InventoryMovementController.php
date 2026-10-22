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
    public function store(Request $request, InventoryService $service){
        $data = $request->validate([
            'inventory_id' => ['required', 'uuid', 'exists:inventories,id'],
            'type' => ['required', 'in:purchase,return,damage,reservation,release,sale'],
            'quantity' => ['required', 'integer', 'min:1'],
            'reason' => ['nullable', 'string'],
        ]);
        $inventory = Inventory::findOrFail($data['inventory_id']);
        $movement = $service->recordMovement(
            $inventory,
            $data['type'],
            $data['quantity'],
            $data['reason'],
            createdBy:$request->user()->id
        );
        return response()->json([
        'movement' => $movement,
    ], 201);
    }
}
