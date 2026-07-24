<?php

namespace App\Events;

use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class BloodRequestCreated implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(
        public int $userId,
        public string $title,
        public string $message,
        public int $requestId,
        public int $hospitalId,
        public string $hospitalName,
        public string $bloodGroup,
    ) {
    }

    // Broadcast new blood request notifications on a private per-user channel.
    public function broadcastOn(): array
    {
        return [
            new PrivateChannel('user.'.$this->userId),
        ];
    }

    public function broadcastAs(): string
    {
        return 'blood-request.created';
    }

    public function broadcastWith(): array
    {
        return [
            'notification' => [
                'title' => $this->title,
                'message' => $this->message,
                'request_id' => $this->requestId,
                'hospital_id' => $this->hospitalId,
                'hospital_name' => $this->hospitalName,
                'blood_group' => $this->bloodGroup,
            ],
        ];
    }
}
