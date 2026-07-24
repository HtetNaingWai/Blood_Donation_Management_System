<?php

namespace App\Services;

use App\Events\MessageSent;
use App\Events\UserNotificationCreated;
use App\Models\Conversation;
use App\Models\Message;
use App\Models\User;
use App\Notifications\NewMessageNotification;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\DB;

class ChatService
{
    /**
     * Create a new donor-hospital conversation or return the existing thread.
     */
    public function createConversation(int $donorId, int $hospitalId): Conversation
    {
        return Conversation::firstOrCreate([
            'donor_id' => $donorId,
            'hospital_id' => $hospitalId,
        ]);
    }

    /**
     * Return ordered conversation messages for the requested thread.
     */
    public function getConversationMessages(Conversation $conversation): Collection
    {
        return $conversation->messages()
            ->with('user:id,name,role')
            ->oldest()
            ->get();
    }

    /**
     * Save a new chat message, create the database notification, and broadcast both updates.
     */
    public function sendMessage(Conversation $conversation, User $sender, string $body): Message
    {
        $message = DB::transaction(function () use ($conversation, $sender, $body): Message {
            $message = $conversation->messages()->create([
                'sender_id' => $sender->id,
                'sender_role' => (string) $sender->role,
                'message' => $body,
            ]);

            // Keep the conversation list sorted by the latest activity timestamp.
            $conversation->forceFill([
                'last_message_at' => now(),
            ])->save();

            return $message->load('user:id,name,role');
        });

        $conversation->loadMissing([
            'donor.user:id,name,email,role',
            'hospital.user:id,name,email,role',
        ]);

        $recipient = $sender->role === User::ROLE_DONOR
            ? $conversation->hospital?->user
            : $conversation->donor?->user;

        if ($recipient && $recipient->id !== $sender->id) {
            $recipient->notify(new NewMessageNotification(
                $message,
                $sender->name ?: ucfirst((string) $sender->role),
            ));

            event(new UserNotificationCreated($recipient->id, [
                'type' => 'new_message',
                'title' => 'New Message',
                'message' => sprintf(
                    'You received a new message from %s',
                    $sender->name ?: ucfirst((string) $sender->role),
                ),
                'sender_name' => $sender->name ?: ucfirst((string) $sender->role),
                'sender_id' => $sender->id,
                'sender_role' => (string) $sender->role,
                'conversation_id' => $conversation->id,
                'message_preview' => $message->message,
                'tone' => 'soft',
            ]));
        }

        event(new MessageSent($message));

        return $message;
    }

    /**
     * Mark unread messages from the other participant as read.
     */
    public function markMessagesRead(Conversation $conversation, User $reader): int
    {
        return $conversation->messages()
            ->whereNull('read_at')
            ->where('sender_id', '!=', $reader->id)
            ->update([
                'read_at' => now(),
                'updated_at' => now(),
            ]);
    }
}
