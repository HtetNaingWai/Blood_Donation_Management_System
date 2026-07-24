<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Notifications\DatabaseNotification;
use Illuminate\Support\Carbon;

class NotificationController extends Controller
{
    /**
     * Return the latest notifications plus unread count for the signed-in dashboard user.
     */
    public function index(Request $request): JsonResponse
    {
        $notifications = $request->user()
            ->notifications()
            ->latest()
            ->limit(10)
            ->get();

        return response()->json([
            'notifications' => $notifications
                ->map(fn (DatabaseNotification $notification): array => $this->notificationPayload($notification))
                ->values()
                ->all(),
            'unread_count' => $request->user()->unreadNotifications()->count(),
        ]);
    }

    /**
     * Mark one notification as read without exposing notifications owned by other users.
     */
    public function markAsRead(Request $request, string $notificationId): JsonResponse
    {
        $notification = $request->user()
            ->notifications()
            ->where('id', $notificationId)
            ->first();

        if (! $notification) {
            return response()->json([
                'message' => 'Notification not found.',
            ], JsonResponse::HTTP_NOT_FOUND);
        }

        if (! $notification->read_at) {
            $notification->markAsRead();
        }

        return response()->json([
            'message' => 'Notification marked as read.',
            'notification' => $this->notificationPayload($notification->fresh()),
            'unread_count' => $request->user()->unreadNotifications()->count(),
        ]);
    }

    /**
     * Mark the current user's unread notifications as read in one action for the dashboard.
     */
    public function markAllAsRead(Request $request): JsonResponse
    {
        $request->user()->unreadNotifications->markAsRead();

        return response()->json([
            'message' => 'All notifications marked as read.',
            'unread_count' => 0,
        ]);
    }

    private function notificationPayload(DatabaseNotification $notification): array
    {
        $data = is_array($notification->data) ? $notification->data : [];

        return [
            'id' => $notification->id,
            'type' => $data['type'] ?? $notification->type,
            'title' => $data['title'] ?? 'Notification',
            'body' => $data['message'] ?? 'You have a new update.',
            'request_id' => $data['request_id'] ?? null,
            'hospital_id' => $data['hospital_id'] ?? null,
            'blood_group' => $data['blood_group'] ?? null,
            'hospital_name' => $data['hospital_name'] ?? null,
            'sender_name' => $data['sender_name'] ?? null,
            'sender_id' => $data['sender_id'] ?? null,
            'sender_role' => $data['sender_role'] ?? null,
            'conversation_id' => $data['conversation_id'] ?? null,
            'message_preview' => $data['message_preview'] ?? null,
            'tone' => $data['tone'] ?? 'soft',
            'is_read' => $notification->read_at !== null,
            'read_at' => $notification->read_at,
            'created_at' => $notification->created_at,
            'age' => $this->formatRelativeTime($notification->created_at),
        ];
    }

    private function formatRelativeTime(mixed $value): string
    {
        if (! $value) {
            return 'Recently';
        }

        try {
            return Carbon::parse($value)->diffForHumans();
        } catch (\Throwable) {
            return 'Recently';
        }
    }
}
