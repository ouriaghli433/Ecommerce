<?php

namespace App\Policies;

use App\Models\Notification;
use App\Models\User;

// A customer only sees and reads their own notifications.
class NotificationPolicy
{
    public function view(User $user, Notification $notification): bool
    {
        return $notification->user_id === $user->id;
    }

    public function update(User $user, Notification $notification): bool
    {
        return $notification->user_id === $user->id;
    }
}
