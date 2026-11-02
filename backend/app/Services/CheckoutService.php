<?php 

namespace App\Services;

use App\Models\Address;
use App\Models\ShippingPrice;
use App\Models\User;

class CheckoutService{
    public function getActiveCart(User $user){
        // get cart and cart lines
        $activeCart = $user->carts()
            ->where('status', 'active')
            ->with('cartLines.product')
            ->first();

        return $activeCart;
    }
    public function calculateSubtotal($cartLines): int
    {
        $subTotal = 0;

        foreach ($cartLines as $cartLine) {
            $subTotal += $cartLine->quantity * $cartLine->unit_price;
        }

        return $subTotal;
    }
    public function resolveAddress(User $user, ?string $addressId = null): ?Address
    {
        if($addressId) {
            $address = $user->addresses()
                ->where('id', $addressId)
                ->firstOrFail();
        } else {
            $address = $user->addresses()
                ->where('is_default', true)
                ->first();
        }
        return $address;
    }

    public function calculateShipping(?Address $address): ?ShippingPrice
    {
        if (!$address) {
            return null;
        }
        return ShippingPrice::where('city', $address->city)
            ->where('is_active', true)
            ->first();
    }
    
    public function calculateTotals(
        int $subTotal,
        int $shippingCost,
        int $discount = 0
    ): array {
        $total = $subTotal + $shippingCost - $discount;

        return [
            'sub_total' => $subTotal,
            'shipping_cost' => $shippingCost,
            'discount' => $discount,
            'total' => max(0, $total),
        ];
    }
}