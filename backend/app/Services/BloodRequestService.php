<?php

namespace App\Services;

use App\Models\Donor;
use App\Models\EmergencyRequest;
use App\Models\Hospital;
use App\Models\RequestResponse;
use App\Notifications\BloodRequestNotification;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\DB;

class BloodRequestService
{
    /**
     * Create a single hospital-to-donor request and notify the donor.
     */
    public function createDirectRequest(Hospital $hospital, Donor $donor, array $payload): EmergencyRequest
    {
        return DB::transaction(function () use ($hospital, $donor, $payload): EmergencyRequest {
            $bloodRequest = EmergencyRequest::create([
                'hospital_id' => $hospital->id,
                'donor_id' => $donor->id,
                'blood_type' => $payload['blood_group'],
                'units_needed' => $payload['units_required'] ?? 1,
                'status' => EmergencyRequest::STATUS_PENDING,
                'priority' => $payload['urgency'] ?? 'standard',
                'message' => $payload['message'],
            ]);

            $donor->user?->notify(BloodRequestNotification::newBloodRequest(
                requestId: $bloodRequest->id,
                hospitalId: $hospital->id,
                hospitalName: $hospital->hospital_name,
                bloodGroup: $bloodRequest->blood_type,
                urgency: $bloodRequest->priority,
                location: $hospital->address,
                customMessage: $payload['message'],
            ));

            return $bloodRequest->fresh(['hospital.user', 'donor.user']);
        });
    }

    /**
     * Load only the direct requests that belong to one donor.
     */
    public function donorRequests(Donor $donor): Collection
    {
        return EmergencyRequest::query()
            ->with(['hospital.user', 'donor.user'])
            ->where('donor_id', $donor->id)
            ->latest()
            ->get();
    }

    /**
     * Mark one donor-owned request as accepted and notify the hospital.
     */
    public function acceptRequest(EmergencyRequest $bloodRequest, Donor $donor): EmergencyRequest
    {
        return $this->updateRequestStatus(
            bloodRequest: $bloodRequest,
            donor: $donor,
            status: EmergencyRequest::STATUS_ACCEPTED,
            notification: BloodRequestNotification::requestAccepted(
                requestId: $bloodRequest->id,
                donorName: $donor->user?->name ?? 'Donor',
            ),
        );
    }

    /**
     * Mark one donor-owned request as rejected and notify the hospital.
     */
    public function rejectRequest(EmergencyRequest $bloodRequest, Donor $donor): EmergencyRequest
    {
        return $this->updateRequestStatus(
            bloodRequest: $bloodRequest,
            donor: $donor,
            status: EmergencyRequest::STATUS_REJECTED,
            notification: BloodRequestNotification::requestRejected(
                requestId: $bloodRequest->id,
                donorName: $donor->user?->name ?? 'Donor',
            ),
        );
    }

    private function updateRequestStatus(
        EmergencyRequest $bloodRequest,
        Donor $donor,
        string $status,
        BloodRequestNotification $notification,
    ): EmergencyRequest {
        return DB::transaction(function () use ($bloodRequest, $donor, $status, $notification): EmergencyRequest {
            $bloodRequest->update([
                'status' => $status,
            ]);

            RequestResponse::updateOrCreate(
                [
                    'emergency_request_id' => $bloodRequest->id,
                    'donor_id' => $donor->id,
                ],
                [
                    'hospital_id' => $bloodRequest->hospital_id,
                    'status' => $status,
                ],
            );

            $bloodRequest->hospital?->user?->notify($notification);

            return $bloodRequest->fresh(['hospital.user', 'donor.user']);
        });
    }
}
