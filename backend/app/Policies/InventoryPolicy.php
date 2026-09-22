<?php

namespace App\Policies;

use App\Models\User;

// Stock levels and movements are for admins only.
// Called with the class: Gate::authorize('view', Inventory::class)
class InventoryPolicy
{
    public function view(User $user): bool
    {
        return $user->isAdmin();
    }

    public function update(User $user): bool
    {
        return $user->isAdmin();
    }
}
