<?php

namespace App\Notifications;

use App\Models\Message;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;
use Illuminate\Support\Str;

class NewMessageNotification extends Notification
{
    use Queueable;

    public function __construct(
        private readonly Message $message,
        private readonly string $senderName,
    ) {
    }

    /**
     * Store the chat notification in the database so dashboard bells can load it later.
     */
    public function via(object $notifiable): array
    {
        return ['database'];
    }

    /**
     * Save a compact payload that both donor and hospital dashboards can render safely.
     */
    public function toDatabase(object $notifiable): array
    {
        return [
            'type' => 'new_message',
            'title' => 'New Message',
            'message' => sprintf('You received a new message from %s', $this->senderName),
            'sender_name' => $this->senderName,
            'sender_id' => $this->message->sender_id,
            'sender_role' => $this->message->sender_role,
            'conversation_id' => $this->message->conversation_id,
            'message_preview' => Str::limit($this->message->message, 120),
            'tone' => 'soft',
        ];
    }
}
