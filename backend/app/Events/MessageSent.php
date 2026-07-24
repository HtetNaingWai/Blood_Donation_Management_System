<?php

namespace App\Events;

use App\Models\Message;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class MessageSent implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(public Message $message)
    {
    }

    // Broadcast each chat message on the private conversation channel for the donor-hospital pair.
    public function broadcastOn(): array
    {
        return [
            new PrivateChannel('conversation.'.$this->message->conversation_id),
        ];
    }

    // A custom event name keeps Echo listeners explicit and easy to understand in React.
    public function broadcastAs(): string
    {
        return 'message.sent';
    }

    // Send only the data the chat UI needs to append a new message instantly.
    public function broadcastWith(): array
    {
        return [
            'chat_message' => [
                'id' => $this->message->id,
                'conversation_id' => $this->message->conversation_id,
                'sender_id' => $this->message->sender_id,
                'sender_role' => $this->message->sender_role,
                'sender_name' => $this->message->user?->name,
                'message' => $this->message->message,
                'read_at' => $this->message->read_at,
                'created_at' => $this->message->created_at,
                'updated_at' => $this->message->updated_at,
            ],
        ];
    }
}
