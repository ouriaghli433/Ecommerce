<?php

use App\Http\Controllers\Auth\AuthController;
use App\Http\Controllers\Catalog\CategoryController;
use App\Http\Controllers\Catalog\ProductController;
use App\Http\Controllers\Inventory\InventoryController;
use App\Http\Controllers\User\UserController;
use Illuminate\Support\Facades\Route;

/*
| Public routes
*/
Route::post('/register', [AuthController::class, 'register']);
Route::post('/login', [AuthController::class, 'login']);

Route::apiResource('categories', CategoryController::class)->only(['index', 'show']);
Route::apiResource('products', ProductController::class)->only(['index', 'show']);

/*
| Routes for logged-in users (Bearer token from /login or /register)
| Admin-only actions are checked by the policies in app/Policies.
*/
Route::middleware('auth:sanctum')->group(function () {
    Route::get('/me', [AuthController::class, 'me']);
    Route::post('/logout', [AuthController::class, 'logout']);

    Route::apiResource('users', UserController::class)->only(['index', 'show', 'update']);

    Route::apiResource('categories', CategoryController::class)->only(['store', 'update', 'destroy']);
    Route::apiResource('products', ProductController::class)->only(['store', 'update', 'destroy']);

    // Stock (admin only)
    Route::get('/products/{product}/inventory', [InventoryController::class, 'show']);
    Route::get('/products/{product}/inventory/movements', [InventoryController::class, 'movements']);
    Route::post('/products/{product}/inventory/movements', [InventoryController::class, 'storeMovement']);
});
