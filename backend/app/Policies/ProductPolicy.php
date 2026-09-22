<?php

namespace App\Policies;

use App\Models\Product;
use App\Models\User;

// Anyone can browse products. Only admins can change them.
class ProductPolicy
{
    public function create(User $user): bool
    {
        return $user->isAdmin();
    }

    public function update(User $user, Product $product): bool
    {
        return $user->isAdmin();
    }

    public function delete(User $user, Product $product): bool
    {
        return $user->isAdmin();
    }
}
