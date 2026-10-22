<?php

namespace App\Http\Controllers\Inventory;

use App\Http\Controllers\Controller;
use App\Models\Inventory;
use Illuminate\Http\Request;

class InventoryController extends Controller
{
    public function index()
    {
        $inventories = Inventory::with('product')->get();

        return response()->json($inventories);
    }
    public function show(Inventory $inventory)
    {
        $inventory->load('product');

        return response()->json($inventory);
    }
}
