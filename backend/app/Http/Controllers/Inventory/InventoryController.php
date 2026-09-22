<?php

namespace App\Http\Controllers\Inventory;

use App\Http\Controllers\Controller;
use App\Http\Requests\Inventory\StoreInventoryMovementRequest;
use App\Http\Resources\Inventory\InventoryMovementResource;
use App\Http\Resources\Inventory\InventoryResource;
use App\Models\Inventory;
use App\Models\Product;
use App\Services\Inventory\InventoryService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\Gate;

class InventoryController extends Controller
{
    public function show(Product $product): InventoryResource
    {
        Gate::authorize('view', Inventory::class);

        return new InventoryResource($product->inventory()->firstOrFail());
    }

    public function movements(Product $product): AnonymousResourceCollection
    {
        Gate::authorize('view', Inventory::class);

        $movements = $product->inventoryMovements()->latest('created_at')->paginate(15);

        return InventoryMovementResource::collection($movements);
    }

    public function storeMovement(StoreInventoryMovementRequest $request, Product $product, InventoryService $inventoryService): JsonResponse
    {
        $movement = $inventoryService->changeOnHand(
            $product,
            $request->type,
            $request->integer('quantity'),
            $request->reason,
            $request->user(),
        );

        return response()->json([
            'movement' => new InventoryMovementResource($movement),
            'inventory' => new InventoryResource($product->inventory()->first()),
        ], 201);
    }
}
