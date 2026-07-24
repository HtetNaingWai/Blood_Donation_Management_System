<?php

use App\Models\Conversation;
use App\Models\User;
use Illuminate\Support\Facades\Broadcast;

Broadcast::channel('App.Models.User.{id}', function ($user, $id) {
    return (int) $user->id === (int) $id;
});

Broadcast::channel('user.{id}', function (User $user, int $id): bool {
    return (int) $user->id === $id;
});

Broadcast::channel('conversation.{id}', function (User $user, int $id): bool {
    $conversation = Conversation::find($id);

    if (! $conversation) {
        return false;
    }

    // Only the donor or hospital that owns the conversation may subscribe to its private websocket channel.
    return match ($user->role) {
        User::ROLE_DONOR => (int) ($user->donor?->id ?? 0) === (int) $conversation->donor_id,
        User::ROLE_HOSPITAL => (int) ($user->hospital?->id ?? 0) === (int) $conversation->hospital_id,
        default => false,
    };
});
