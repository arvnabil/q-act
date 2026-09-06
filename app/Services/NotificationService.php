<?php

namespace App\Services;

use App\Models\Notification;
use App\Models\User;

class NotificationService
{
    /**
     * Send notification to a specific user.
     */
    public static function notifyUser(string|int $userId, string $title, string $message, ?string $link = null): void
    {
        if (!$userId) return;

        Notification::create([
            'id' => (string) \Illuminate\Support\Str::uuid(),
            'user_id' => $userId,
            'title' => $title,
            'message' => $message,
            'link' => $link,
            'is_read' => false,
        ]);
    }

    /**
     * Send notification to all users (broadcast).
     */
    public static function notifyAll(string $title, string $message, ?string $link = null): void
    {
        $userIds = User::pluck('id');
        $now = now();
        $records = [];

        foreach ($userIds as $id) {
            $records[] = [
                'id' => (string) \Illuminate\Support\Str::uuid(),
                'user_id' => $id,
                'title' => $title,
                'message' => $message,
                'link' => $link,
                'is_read' => false,
                'created_at' => $now,
                'updated_at' => $now,
            ];
        }

        if (!empty($records)) {
            Notification::insert($records);
        }
    }
}
