<?php

namespace App\Policies;

use App\Models\User;

// Only admins manage users. Customers use /api/me for their own account.
class UserPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->isAdmin();
    }

    public function view(User $user, User $model): bool
    {
        return $user->isAdmin();
    }

    public function update(User $user, User $model): bool
    {
        return $user->isAdmin();
    }
}
