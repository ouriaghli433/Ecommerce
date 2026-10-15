<?php

use App\Http\Controllers\Auth\AuthController;
use App\Http\Controllers\Category\CategoryController;
use Illuminate\Support\Facades\Route;

// Public
Route::post('/register', [AuthController::class, 'register']);
Route::get('/login', [AuthController::class, 'login']);

// Authenticated
Route::middleware('auth:sanctum')->group(function () {
    Route::get('/me', [AuthController::class, 'me']);
    Route::get('/logout', [AuthController::class, 'logout']);
});

// Authenticated Admin
Route::middleware(['auth:sanctum','role:admin'])->group(function(){
    Route::apiResource('/category', CategoryController::class);
});
