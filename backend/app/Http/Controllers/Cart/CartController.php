<?php

namespace App\Http\Controllers\Cart;

use App\Http\Controllers\Controller;
use App\Models\Cart;
use App\Models\Product;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class CartController extends Controller
{
    /**
     * Add a product to the active cart.
     */
    public function store(Request $request)
    {
        // Validate the product ID and requested quantity.
        $validated = $request->validate([
            'product_id' => ['required', 'uuid', 'exists:products,id'],
            'quantity' => ['required', 'integer', 'min:1'],
        ]);

        // Find or create the active cart for the authenticated user or guest.
        [$cart, $guestToken] = $this->activeCart($request);

        // Retrieve the requested product.
        $product = Product::findOrFail($validated['product_id']);

        // Prevent inactive products from being added to the cart.
        if (! $product->is_active) {
            return response()->json([
                'message' => 'This product is not available.',
            ], 422);
        }

        // Retrieve the product inventory record.
        $inventory = $product->inventory;

        // Stop if the product has no inventory record.
        if (! $inventory) {
            return response()->json([
                'message' => 'Product inventory not found.',
            ], 422);
        }

        // check whether this product already exists in the cart
        $cartLine = $cart->cartLines()
            ->where('product_id', $product->id)
            ->first();

        // start with the quantity requested in the current request
        $newQuantity = $validated['quantity'];

        // add the existing quantity if the product is already in the cart
        if ($cartLine) {
            $newQuantity += $cartLine->quantity;
        }

        // calculate the stock available for purchase
        $availableStock = $inventory->on_hand - $inventory->reserved;

        // rejectt the request if the new quantity exceeds available stock
        if ($newQuantity > $availableStock) {
            return response()->json([
                'message' => 'Requested quantity exceeds available stock.',
            ], 422);
        }

        // update the existing cart line or create a new one
        if ($cartLine) {
            // increase the quantity of the existing cart line
            $cartLine->update([
                'quantity' => $newQuantity,
            ]);
        } else {
            // create a cart line 
            $cart->cartLines()->create([
                'product_id' => $product->id,
                'quantity' => $newQuantity,
                'unit_price' => $product->price,
            ]);
        }

        // load cart lines and their related products for the response
        $cart->load('cartLines.product');

        // Return the updated cart and the guest token, if applicable
        return response()->json([
            'message' => 'Product added to cart successfully.',
            'cart' => $cart,
            'guest_token' => $guestToken,
        ]);
    }

    /**
     * Display the active cart.
     */
    public function show(Request $request)
    {
        // Retrieve the active cart and guest token, if applicable.
        [$cart, $guestToken] = $this->activeCart($request);

        // Load all cart lines and their related products.
        $cart->load('cartLines.product');

        // Return the cart contents.
        return response()->json([
            'cart' => $cart,
            'guest_token' => $guestToken,
        ]);
    }

    /**
     * Replace the quantity of an existing cart line.
     */
    public function update(Request $request, string $cartLineId)
    {
        // Validate the new quantity.
        $validated = $request->validate([
            'quantity' => ['required', 'integer', 'min:1'],
        ]);

        // Retrieve the active cart for the current user or guest.
        [$cart, $guestToken] = $this->activeCart($request);

        // Find the cart line only within the current cart.
        // Return 404 if the cart line does not belong to this cart.
        $cartLine = $cart->cartLines()
            ->whereKey($cartLineId)
            ->firstOrFail();

        // Retrieve the product associated with the cart line.
        $product = $cartLine->product;

        // Prevent inactive products from being purchased.
        if (! $product->is_active) {
            return response()->json([
                'message' => 'This product is not available.',
            ], 422);
        }

        // Retrieve the product inventory record.
        $inventory = $product->inventory;

        // Stop if the product has no inventory record.
        if (! $inventory) {
            return response()->json([
                'message' => 'Product inventory not found.',
            ], 422);
        }

        // Calculate the currently available stock.
        $availableStock = $inventory->on_hand - $inventory->reserved;

        // Reject the update if the requested quantity exceeds available stock.
        if ($validated['quantity'] > $availableStock) {
            return response()->json([
                'message' => 'Requested quantity exceeds available stock.',
            ], 422);
        }

        // Replace the old quantity with the new quantity.
        $cartLine->update([
            'quantity' => $validated['quantity'],
        ]);

        // Reload the cart lines and their related products.
        $cart->load('cartLines.product');

        // Return the updated cart.
        return response()->json([
            'message' => 'Cart quantity updated successfully.',
            'cart' => $cart,
            'guest_token' => $guestToken,
        ]);
    }

    /**
     * Remove a product from the active cart.
     */
    public function destroy(Request $request, string $cartLineId)
    {
        // Retrieve the active cart for the current user or guest.
        [$cart, $guestToken] = $this->activeCart($request);

        // Find the cart line only within the current cart.
        // Return 404 if the cart line does not belong to this cart.
        $cartLine = $cart->cartLines()
            ->whereKey($cartLineId)
            ->firstOrFail();

        // Delete the cart line from the database.
        $cartLine->delete();

        // Reload the remaining cart lines and their products.
        $cart->load('cartLines.product');

        // Return the updated cart.
        return response()->json([
            'message' => 'Product removed from cart successfully.',
            'cart' => $cart,
            'guest_token' => $guestToken,
        ]);
    }

    /**
     * Find or create the active cart for a user or guest.
     */
    private function activeCart(Request $request): array
    {
        // Identify the authenticated user, if any.
        $user = auth('sanctum')->user();

        // Handle the authenticated user's cart.
        if ($user) {
            // Find the user's active cart or create one if it does not exist.
            $cart = Cart::firstOrCreate([
                'user_id' => $user->id,
                'status' => 'active',
            ]);

            // Authenticated users do not need a guest token.
            return [$cart, null];
        }

        // Read the guest token from the request header.
        $guestToken = $request->header('X-Guest-Token');

        // Generate a new UUID if the guest has no token.
        if (! $guestToken) {
            $guestToken = (string) Str::uuid();
        }

        // Find the guest's active cart or create one if necessary.
        $cart = Cart::firstOrCreate([
            'guest_token' => $guestToken,
            'status' => 'active',
        ]);

        // Return the cart and token so the client can reuse the token.
        return [$cart, $guestToken];
    }
}
