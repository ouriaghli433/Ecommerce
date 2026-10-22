<?php

use App\Http\Controllers\Auth\AuthController;
use App\Http\Controllers\Category\CategoryController;
use App\Http\Controllers\Inventory\InventoryController;
use App\Http\Controllers\Inventory\InventoryMovementController;
use App\Http\Controllers\Product\ProductController;
use Illuminate\Support\Facades\Route;

// Public
// Auth
Route::post('/register', [AuthController::class, 'register']);
Route::post('/login', [AuthController::class, 'login']);
// Category
Route::get('/category', [CategoryController::class, 'index']);
Route::get('/category/{category}', [CategoryController::class, 'show']);
// Product
Route::get('/product', [ProductController::class, 'index']);
Route::get('/product/{product}', [ProductController::class, 'show']);

// Authenticated
Route::middleware('auth:sanctum')->group(function () {
    Route::get('/me', [AuthController::class, 'me']);
    Route::post('/logout', [AuthController::class, 'logout']);
});

// Authenticated Admin
Route::middleware(['auth:sanctum', 'role:admin'])->group(function () {
    // Category
    Route::post('/category', [CategoryController::class, 'store']);
    Route::put('/category/{category}', [CategoryController::class, 'update']);
    Route::delete('/category/{category}', [CategoryController::class, 'destroy']);
    // Product
    Route::post('/product', [ProductController::class, 'store']);
    Route::put('/product/{product}', [ProductController::class, 'update']);
    Route::delete('/product/{product}', [ProductController::class, 'destroy']);
    // Inventory
    Route::get('/inventory', [InventoryController::class, 'index']);
    Route::get('/inventory/{inventory}', [InventoryController::class, 'show']);
    // Inventory Movement
    Route::get('/inventory-movement', [InventoryMovementController::class, 'index']);
    Route::post('/inventory-movement', [InventoryMovementController::class, 'store']);
    Route::get('/inventory-movement/{inventoryMovement}', [InventoryMovementController::class, 'show']);
});
