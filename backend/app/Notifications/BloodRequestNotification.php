<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

class BloodRequestNotification extends Notification
{
    use Queueable;

    public function __construct(
        private readonly string $notificationType,
        private readonly string $title,
        private readonly string $message,
        private readonly int $requestId,
        private readonly array $meta = [],
    ) {
    }

    public static function newBloodRequest(
        int $requestId,
        int $hospitalId,
        string $hospitalName,
        string $bloodGroup,
        ?string $urgency,
        ?string $location,
        ?string $customMessage = null,
    ): self {
        return new self(
            notificationType: 'blood_request',
            title: 'New Blood Request',
            message: $customMessage ?: sprintf(
                '%s needs %s blood%s%s',
                $hospitalName,
                $bloodGroup,
                $urgency ? ' ('.$urgency.')' : '',
                $location ? ' at '.$location : '',
            ),
            requestId: $requestId,
            meta: [
                'hospital_id' => $hospitalId,
                'hospital_name' => $hospitalName,
                'blood_group' => $bloodGroup,
                'urgency' => $urgency,
                'location' => $location,
                'tone' => $urgency === 'critical' ? 'danger' : 'soft',
            ],
        );
    }

    public static function requestAccepted(int $requestId, string $donorName): self
    {
        return new self(
            notificationType: 'request_accepted',
            title: 'Request Accepted',
            message: $donorName.' accepted your blood request.',
            requestId: $requestId,
            meta: [
                'sender_name' => $donorName,
                'tone' => 'success',
            ],
        );
    }

    public static function requestRejected(int $requestId, string $donorName): self
    {
        return new self(
            notificationType: 'request_rejected',
            title: 'Request Rejected',
            message: $donorName.' rejected your blood request.',
            requestId: $requestId,
            meta: [
                'sender_name' => $donorName,
                'tone' => 'danger',
            ],
        );
    }

    // Store this alert in the database so donors can fetch it from the notifications API.
    public function via(object $notifiable): array
    {
        return ['database'];
    }

    // Keep the payload aligned with the existing notification controller response shape.
    public function toDatabase(object $notifiable): array
    {
        return array_merge($this->meta, [
            'type' => $this->notificationType,
            'title' => $this->title,
            'message' => $this->message,
            'request_id' => $this->requestId,
        ]);
    }
}
