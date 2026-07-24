<?php

namespace Tests\Feature;

use App\Http\Controllers\Api\DonorController;
use App\Http\Controllers\Api\HospitalController;
use App\Models\Donor;
use App\Models\Hospital;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Request;
use Tests\TestCase;

class DirectBloodRequestWorkflowTest extends TestCase
{
    use RefreshDatabase;

    public function test_hospital_can_send_direct_request_and_donor_can_accept_it(): void
    {
        $hospitalUser = User::create([
            'name' => 'City Hospital',
            'email' => 'city-hospital@example.com',
            'phone' => '09700000001',
            'password' => 'password123',
            'role' => User::ROLE_HOSPITAL,
            'status' => 'active',
        ]);

        $hospital = $hospitalUser->hospital()->create([
            'hospital_name' => 'City Hospital',
            'license_number' => 'MED-9001',
            'address' => 'Yangon',
            'approval_status' => 'approved',
        ]);

        $donorUser = User::create([
            'name' => 'Aye Aye',
            'email' => 'aye-aye@example.com',
            'phone' => '09700000002',
            'password' => 'password123',
            'role' => User::ROLE_DONOR,
            'status' => 'active',
        ]);

        $donor = $donorUser->donor()->create([
            'blood_type' => 'A+',
            'general_location' => 'Yangon',
            'is_eligible' => true,
            'availability_status' => 'available',
            'email_notifications' => true,
            'location_sharing' => true,
            'consented_at' => now(),
        ]);

        $createRequest = Request::create('/api/hospital/blood-request', 'POST', [
            'donor_id' => $donor->id,
            'blood_group' => 'A+',
            'message' => 'Urgent blood needed',
        ]);
        $createRequest->setUserResolver(fn (): User => $hospitalUser->fresh()->load('hospital'));

        $createResponse = app(HospitalController::class)->sendBloodRequest($createRequest);

        $this->assertSame(201, $createResponse->getStatusCode());
        $this->assertSame('Blood request sent successfully.', $createResponse->getData(true)['message']);
        $this->assertSame($hospital->id, $createResponse->getData(true)['request']['hospital_id']);
        $this->assertSame($donor->id, $createResponse->getData(true)['request']['donor_id']);
        $this->assertSame('pending', $createResponse->getData(true)['request']['status']);

        $this->assertDatabaseHas('emergency_requests', [
            'hospital_id' => $hospital->id,
            'donor_id' => $donor->id,
            'blood_type' => 'A+',
            'status' => 'pending',
            'message' => 'Urgent blood needed',
        ]);

        $this->assertDatabaseHas('notifications', [
            'notifiable_id' => $donorUser->id,
            'notifiable_type' => User::class,
        ]);

        $requestsRequest = Request::create('/api/donor/requests', 'GET');
        $requestsRequest->setUserResolver(fn (): User => $donorUser->fresh()->load('donor'));
        $requestsResponse = app(DonorController::class)->requests($requestsRequest);
        $requestsPayload = $requestsResponse->getData(true);
        $requestId = $requestsPayload['received_requests'][0]['id'] ?? null;

        $this->assertSame(200, $requestsResponse->getStatusCode());
        $this->assertSame($donor->id, $requestsPayload['received_requests'][0]['donor_id']);
        $this->assertSame('pending', $requestsPayload['received_requests'][0]['status']);

        $acceptRequest = Request::create("/api/donor/requests/{$requestId}/accept", 'POST');
        $acceptRequest->setUserResolver(fn (): User => $donorUser->fresh()->load('donor'));
        $acceptResponse = app(DonorController::class)->acceptRequest($acceptRequest, $requestId);

        $this->assertSame(200, $acceptResponse->getStatusCode());
        $this->assertSame('Blood request accepted successfully.', $acceptResponse->getData(true)['message']);
        $this->assertSame('accepted', $acceptResponse->getData(true)['request']['status']);

        $this->assertDatabaseHas('emergency_requests', [
            'id' => $requestId,
            'status' => 'accepted',
        ]);

        $this->assertDatabaseHas('request_responses', [
            'emergency_request_id' => $requestId,
            'donor_id' => $donor->id,
            'hospital_id' => $hospital->id,
            'status' => 'accepted',
        ]);

        $this->assertDatabaseCount('notifications', 2);
    }

    public function test_donor_can_reject_only_their_own_direct_request(): void
    {
        $hospitalUser = User::create([
            'name' => 'General Hospital',
            'email' => 'general-hospital@example.com',
            'phone' => '09700000003',
            'password' => 'password123',
            'role' => User::ROLE_HOSPITAL,
            'status' => 'active',
        ]);

        $hospital = $hospitalUser->hospital()->create([
            'hospital_name' => 'General Hospital',
            'license_number' => 'MED-9002',
            'address' => 'Mandalay',
            'approval_status' => 'approved',
        ]);

        $ownerUser = User::create([
            'name' => 'Owner Donor',
            'email' => 'owner-donor@example.com',
            'phone' => '09700000004',
            'password' => 'password123',
            'role' => User::ROLE_DONOR,
            'status' => 'active',
        ]);

        $ownerDonor = $ownerUser->donor()->create([
            'blood_type' => 'O+',
            'general_location' => 'Mandalay',
            'is_eligible' => true,
            'availability_status' => 'available',
            'email_notifications' => true,
            'location_sharing' => true,
            'consented_at' => now(),
        ]);

        $otherUser = User::create([
            'name' => 'Other Donor',
            'email' => 'other-owner@example.com',
            'phone' => '09700000005',
            'password' => 'password123',
            'role' => User::ROLE_DONOR,
            'status' => 'active',
        ]);

        $otherUser->donor()->create([
            'blood_type' => 'O+',
            'general_location' => 'Mandalay',
            'is_eligible' => true,
            'availability_status' => 'available',
            'email_notifications' => true,
            'location_sharing' => true,
            'consented_at' => now(),
        ]);

        $bloodRequest = $hospital->emergencyRequests()->create([
            'donor_id' => $ownerDonor->id,
            'blood_type' => 'O+',
            'units_needed' => 1,
            'status' => 'pending',
            'priority' => 'standard',
            'message' => 'Please help',
        ]);

        $rejectRequest = Request::create("/api/donor/requests/{$bloodRequest->id}/reject", 'POST');
        $rejectRequest->setUserResolver(fn (): User => $otherUser->fresh()->load('donor'));
        $rejectResponse = app(DonorController::class)->rejectRequest($rejectRequest, $bloodRequest->id);

        $this->assertSame(404, $rejectResponse->getStatusCode());
    }
}
