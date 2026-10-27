<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\LoginRequest;
use App\Http\Requests\Auth\RegisterRequest;
use App\Models\Cart;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Str;

class AuthController extends Controller
{
    public function register(RegisterRequest $request)
    {
        [$guestCart, $guestToken] = $this->getGuestCart($request);
        $validated = $request->validated();
        $first_name = $validated['first_name'];
        $last_name = $validated['last_name'];
        $email = $validated['email'];
        $password = Hash::make($validated['password']);
        $user = User::create([
            'first_name' => $first_name,
            'last_name' => $last_name,
            'email' => $email,
            'password' => $password,
            'role' => 'customer',
        ]);
        $token = $user->createToken('access-token')->plainTextToken;
        
        // Merge cart logic
        $this->mergeGuestCartToUser($request, $user);

        return response()->json([
            'customer' => $user,
            'token' => $token,
        ], 201);
    }

    public function login(LoginRequest $request)
    {
        
        [$guestCart, $guestToken] = $this->getGuestCart($request);
        $validated = $request->validated();
        $user = User::where('email', $validated['email'])->first();

        if (! $user) {
            return response()->json([
                'message' => 'email or password is incorrect',
            ], 401);
        }
        if (! Hash::check($validated['password'], $user->password)) {
            return response()->json([
                'message' => 'email or password is incorrect',
            ], 401);
        }
        $token = $user->createToken('access-token')->plainTextToken;
        
        // Merge cart logic
        $this->mergeGuestCartToUser($request, $user);

        return response()->json([
            'user' => $user,
            'token' => $token,
        ], 200);
    }

    public function me(Request $request)
    {
        $user = $request->user();

        return response()->json([
            'user' => $user,
        ], 200);

    }

    public function logout(Request $request)
    {
        $user = $request->user();
        $user->currentAccessToken()->delete();

        return response()->json([
            'message' => 'logout succesfully',
        ]);
    }
    private function getGuestCart(Request $request): array
    {
        // Read the guest token from the request header.
        $guestToken = $request->header('X-Guest-Token');

        // Find the guest's active cart 
        $cart = Cart::where('guest_token', $guestToken)
            ->where('status', 'active')
            ->first();

        // Return the cart and token so the client can reuse the token.
        return [$cart, $guestToken];
    }


    protected function mergeGuestCartToUser($request, User $user): void
    {
        [$guestCart, $guestToken] = $this->getGuestCart($request);

        if (! $guestCart) {
            return;
        }

        $userCart = $user->carts()->firstOrCreate([
            'status' => 'active',
        ]);

        // Load relations to avoid N+1 queries
        $guestCartLines = $guestCart->cartLines()->with('product.inventory')->get();

        foreach ($guestCartLines as $guestCartLine) {
            $product = $guestCartLine->product;

            // Skip inactive products or missing inventory
            if (! $product || ! $product->is_active || ! $product->inventory) {
                continue;
            }

            $userCartLine = $userCart->cartLines()
                ->where('product_id', $guestCartLine->product_id)
                ->first();

            $currentQuantity = $userCartLine ? $userCartLine->quantity : 0;
            $newQuantity = $currentQuantity + $guestCartLine->quantity;

            $inventory = $product->inventory;
            $availableStock = $inventory->on_hand - $inventory->reserved;

            // Skip if requested quantity exceeds available stock
            if ($newQuantity > $availableStock) {
                continue;
            }

            if ($userCartLine) {
                $userCartLine->update([
                    'quantity' => $newQuantity,
                ]);
            } else {
                $userCart->cartLines()->create([
                    'product_id' => $guestCartLine->product_id,
                    'quantity'   => $guestCartLine->quantity,
                    'unit_price' => $guestCartLine->unit_price,
                ]);
            }
        }

        // Mark guest cart as converted
        $guestCart->update([
            'status' => 'converted',
        ]);
    }
}
