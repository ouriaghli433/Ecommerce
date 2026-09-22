<?php

namespace App\Http\Controllers\Notification;

use App\Http\Controllers\Controller;
use App\Http\Resources\Notification\NotificationResource;
use App\Models\Notification;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\Gate;

class NotificationController extends Controller
{
    /** GET /api/notifications?unread=1 */
    public function index(Request $request): AnonymousResourceCollection
    {
        $query = $request->user()->inAppNotifications()->latest();

        if ($request->boolean('unread')) {
            $query->whereNull('read_at');
        }

        return NotificationResource::collection($query->paginate(15))
            ->additional([
                'meta' => [
                    'unread_count' => $request->user()->inAppNotifications()->whereNull('read_at')->count(),
                ],
            ]);
    }

    /** PATCH /api/notifications/{notification}/read */
    public function markAsRead(Notification $notification): NotificationResource
    {
        Gate::authorize('update', $notification);

        // Already read stays read: the date of the first read is kept.
        if ($notification->read_at === null) {
            $notification->update(['read_at' => now()]);
        }

        return new NotificationResource($notification);
    }

    /** POST /api/notifications/read-all */
    public function markAllAsRead(Request $request): JsonResponse
    {
        $count = $request->user()->inAppNotifications()
            ->whereNull('read_at')
            ->update(['read_at' => now()]);

        return response()->json(['marked_as_read' => $count]);
    }
}
