<?php

namespace App\Http\Controllers\Cart;

use App\Http\Controllers\Controller;
use App\Http\Requests\Cart\AddCartLineRequest;
use App\Http\Requests\Cart\UpdateCartLineRequest;
use App\Http\Resources\Cart\CartResource;
use App\Models\Cart;
use App\Models\CartLine;
use App\Models\Product;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\ValidationException;

class CartController extends Controller
{
    public function show(Request $request): JsonResponse
    {
        $cart = $this->activeCart($request->user());

        return $this->cartResponse($cart);
    }

    /**
     * Add a product. If it is already in the cart, the quantities are added (RG14).
     */
    public function addLine(AddCartLineRequest $request): JsonResponse
    {
        $cart = $this->activeCart($request->user());
        $product = Product::with('inventory')->findOrFail($request->product_id);

        $line = $cart->lines()->where('product_id', $product->id)->first();
        $newQuantity = $request->integer('quantity') + ($line ? $line->quantity : 0);

        $this->ensureCanBuy($product, $newQuantity);

        if ($line) {
            $line->update(['quantity' => $newQuantity]);
        } else {
            $cart->lines()->create([
                'product_id' => $product->id,
                'quantity' => $newQuantity,
                'unit_price' => $product->price,
            ]);
        }

        return $this->cartResponse($cart);
    }

    public function updateLine(UpdateCartLineRequest $request, CartLine $cartLine): JsonResponse
    {
        $product = Product::with('inventory')->findOrFail($cartLine->product_id);

        $this->ensureCanBuy($product, $request->integer('quantity'));

        $cartLine->update(['quantity' => $request->integer('quantity')]);

        return $this->cartResponse($cartLine->cart);
    }

    public function removeLine(CartLine $cartLine): JsonResponse
    {
        Gate::authorize('delete', $cartLine);

        $cartLine->delete();

        return $this->cartResponse($cartLine->cart);
    }

    public function clear(Request $request): JsonResponse
    {
        $cart = $this->activeCart($request->user());
        $cart->lines()->delete();

        return $this->cartResponse($cart);
    }

    // TODO(checkout): POST /api/checkout will turn this cart into an order
    // (status "converted", RG16), reserve stock and snapshot the address.

    /**
     * A customer has at most one active cart (RG13); create it when needed.
     * TODO(concurrency): two parallel first requests could create two carts.
     */
    private function activeCart(User $user): Cart
    {
        return $user->carts()->firstOrCreate(['status' => 'active']);
    }

    /**
     * RG5: inactive products cannot be added.
     * RG15: the quantity cannot exceed the available stock.
     * TODO(concurrency): stock can change right after this check; the real
     * guarantee comes from the reservation at checkout.
     */
    private function ensureCanBuy(Product $product, int $quantity): void
    {
        if (! $product->is_active) {
            throw ValidationException::withMessages([
                'product_id' => 'This product is not available.',
            ]);
        }

        $available = $product->inventory ? $product->inventory->availableStock() : 0;

        if ($quantity > $available) {
            throw ValidationException::withMessages([
                'quantity' => "Only {$available} left in stock.",
            ]);
        }
    }

    private function cartResponse(Cart $cart): JsonResponse
    {
        $cart->load('lines.product');

        // Always 200: Laravel would answer 201 when the cart was just created.
        return (new CartResource($cart))->response()->setStatusCode(200);
    }
}
