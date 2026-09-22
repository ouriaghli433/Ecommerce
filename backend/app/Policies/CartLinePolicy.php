<?php

namespace App\Policies;

use App\Models\CartLine;
use App\Models\User;

// A customer can only change lines of their own active cart.
class CartLinePolicy
{
    public function update(User $user, CartLine $cartLine): bool
    {
        return $cartLine->cart->user_id === $user->id
            && $cartLine->cart->status === 'active';
    }

    public function delete(User $user, CartLine $cartLine): bool
    {
        return $this->update($user, $cartLine);
    }
}
