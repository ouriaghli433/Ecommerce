<?php

use App\Http\Controllers\Address\AddressController;
use App\Http\Controllers\Auth\AuthController;
use App\Http\Controllers\Cart\CartController;
use App\Http\Controllers\Category\CategoryController;
use App\Http\Controllers\Checkout\CheckoutController;
use App\Http\Controllers\Coupon\CouponController;
use App\Http\Controllers\Inventory\InventoryController;
use App\Http\Controllers\Inventory\InventoryMovementController;
use App\Http\Controllers\Order\OrderController;
use App\Http\Controllers\Payment\PaymentController;
use App\Http\Controllers\Product\ProductController;
use App\Http\Controllers\ProductImage\ProductImageController;
use App\Http\Controllers\Refund\RefundController;
use App\Http\Controllers\ShippingPrice\ShippingPriceController;
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
    Route::get('/products/{product}/images', [ProductImageController::class,'index',]);
    Route::get('/products/{product}/images/{image}', [ProductImageController::class,'show',]);
    // Cart
    Route::get('/cart', [CartController::class, 'show']);
    Route::post('/cart', [CartController::class, 'store']);
    Route::patch('/cart/{cartLineId}', [CartController::class, 'update']);
    Route::delete('/cart/{cartLineId}', [CartController::class, 'destroy']);
    // Paiment
    Route::post('/stripe/webhook', [PaymentController::class,'handleWebhook',]);

// Authenticated
Route::middleware('auth:sanctum')->group(function () {
    // Auth
    Route::get('/me', [AuthController::class, 'me']);
    Route::post('/logout', [AuthController::class, 'logout']);
    // Orders
    Route::get('/orders', [OrderController::class, 'index']);
    Route::get('/orders/{order}', [OrderController::class, 'show']);
});

// Authenticated:Admin
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
    // Refund
    Route::post('/payments/{payment}/refund',[RefundController::class, 'store']);
    // Coupons
    Route::apiResource('coupons', CouponController::class);
    // Product Images
    Route::apiResource('products.images', ProductImageController::class)
        ->except(['index', 'show']);    
    // Orders
    Route::patch('/orders/{order}/status', [OrderController::class, 'update']);
    // Shipping Prices
    Route::apiResource('shipping-prices', ShippingPriceController::class);
    
    
});


// Authenticated:User
Route::middleware(['auth:sanctum', 'role:customer'])->group(function () {
    // Checkout
    Route::post('/checkout-preview', [CheckoutController::class, 'preview']);
    Route::post('/checkout-place-order', [CheckoutController::class, 'placeOrder']);
    // Paiment 
    Route::post('/payments/checkout', [PaymentController::class,'createCheckoutSession',]);
    // Addresses
    Route::apiResource('addresses', AddressController::class);
    
    
});