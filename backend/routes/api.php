<?php

use App\Http\Controllers\Address\AddressController;
use App\Http\Controllers\Auth\AuthController;
use App\Http\Controllers\Cart\CartController;
use App\Http\Controllers\Catalog\CategoryController;
use App\Http\Controllers\Catalog\ProductController;
use App\Http\Controllers\Checkout\CheckoutController;
use App\Http\Controllers\Coupon\CouponController;
use App\Http\Controllers\Inventory\InventoryController;
use App\Http\Controllers\Notification\NotificationController;
use App\Http\Controllers\Order\OrderController;
use App\Http\Controllers\Payment\PaymentController;
use App\Http\Controllers\Refund\RefundController;
use App\Http\Controllers\User\UserController;
use App\Http\Controllers\Webhook\PaymentWebhookController;
use Illuminate\Support\Facades\Route;

/*
| Public routes
*/
Route::post('/register', [AuthController::class, 'register']);
Route::post('/login', [AuthController::class, 'login']);

// The payment provider calls this one. No user token: the request is checked
// by its signature instead (RG36).
Route::post('/webhooks/payments/{provider}', [PaymentWebhookController::class, 'store'])
    ->middleware('webhook.signature');

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

    // The logged-in customer's own delivery addresses
    Route::apiResource('addresses', AddressController::class);

    // In-app notifications of the logged-in user
    Route::get('/notifications', [NotificationController::class, 'index']);
    Route::patch('/notifications/{notification}/read', [NotificationController::class, 'markAsRead']);
    Route::post('/notifications/read-all', [NotificationController::class, 'markAllAsRead']);

    Route::apiResource('categories', CategoryController::class)->only(['store', 'update', 'destroy']);
    Route::apiResource('products', ProductController::class)->only(['store', 'update', 'destroy']);

    // The logged-in customer's cart
    Route::get('/cart', [CartController::class, 'show']);
    Route::delete('/cart', [CartController::class, 'clear']);
    Route::post('/cart/lines', [CartController::class, 'addLine']);
    Route::patch('/cart/lines/{cartLine}', [CartController::class, 'updateLine']);
    Route::delete('/cart/lines/{cartLine}', [CartController::class, 'removeLine']);

    /*
    | Money routes. They carry the "idempotency" middleware: sending the same
    | request twice with the same Idempotency-Key header replays the first
    | answer instead of creating a second order, payment or refund.
    */
    Route::middleware('idempotency')->group(function () {
        // Checkout: cart -> order (reserves stock, applies the coupon)
        Route::post('/checkout', [CheckoutController::class, 'store']);
        Route::post('/orders/{order}/payments', [PaymentController::class, 'store']);
        Route::post('/payments/{payment}/refunds', [RefundController::class, 'store']);
    });

    // Orders: customers see their own, admins see all (OrderPolicy)
    Route::get('/orders', [OrderController::class, 'index']);
    Route::get('/orders/{order}', [OrderController::class, 'show']);
    Route::post('/orders/{order}/cancel', [OrderController::class, 'cancel']);
    Route::patch('/orders/{order}/status', [OrderController::class, 'updateStatus']);

    // Payments: the customer starts one (route above), the provider confirms
    // it by webhook
    Route::get('/orders/{order}/payments', [PaymentController::class, 'index']);
    Route::get('/payments/{payment}', [PaymentController::class, 'show']);

    // Refunds (admin); the create route is in the idempotency group above
    Route::get('/payments/{payment}/refunds', [RefundController::class, 'index']);

    // Coupons (admin only)
    Route::apiResource('coupons', CouponController::class);

    // Stock (admin only)
    Route::get('/products/{product}/inventory', [InventoryController::class, 'show']);
    Route::get('/products/{product}/inventory/movements', [InventoryController::class, 'movements']);
    Route::post('/products/{product}/inventory/movements', [InventoryController::class, 'storeMovement']);
});
