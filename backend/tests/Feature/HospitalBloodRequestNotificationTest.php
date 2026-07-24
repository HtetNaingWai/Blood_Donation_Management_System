<?php

namespace Tests\Feature;

use App\Http\Controllers\Api\HospitalController;
use App\Http\Controllers\Api\NotificationController;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Request;
use Tests\TestCase;

class HospitalBloodRequestNotificationTest extends TestCase
{
    use RefreshDatabase;

    public function test_hospital_request_notifies_matching_donor_and_donor_can_fetch_notifications(): void
    {
        $hospitalUser = User::create([
            'name' => 'Htet Hospital',
            'email' => 'hospital-request@example.com',
            'phone' => '09999999991',
            'password' => 'password123',
            'role' => User::ROLE_HOSPITAL,
            'status' => 'active',
        ]);

        $hospital = $hospitalUser->hospital()->create([
            'hospital_name' => 'Htet Hospital',
            'license_number' => 'MED-2201',
            'address' => 'Yangon General Road',
            'latitude' => 16.8409,
            'longitude' => 96.1735,
            'approval_status' => 'approved',
        ]);

        $matchedDonorUser = User::create([
            'name' => 'Aye Donor',
            'email' => 'matched-donor@example.com',
            'phone' => '09999999992',
            'password' => 'password123',
            'role' => User::ROLE_DONOR,
            'status' => 'active',
        ]);

        $matchedDonorUser->donor()->create([
            'blood_type' => 'A+',
            'general_location' => 'Yangon',
            'latitude' => 16.8415,
            'longitude' => 96.1740,
            'is_eligible' => true,
            'availability_status' => 'available',
            'email_notifications' => true,
            'location_sharing' => true,
            'consented_at' => now(),
        ]);

        $otherDonorUser = User::create([
            'name' => 'Other Donor',
            'email' => 'other-donor@example.com',
            'phone' => '09999999993',
            'password' => 'password123',
            'role' => User::ROLE_DONOR,
            'status' => 'active',
        ]);

        $otherDonorUser->donor()->create([
            'blood_type' => 'O+',
            'general_location' => 'Yangon',
            'latitude' => 16.8420,
            'longitude' => 96.1750,
            'is_eligible' => true,
            'availability_status' => 'available',
            'email_notifications' => true,
            'location_sharing' => true,
            'consented_at' => now(),
        ]);

        $createRequest = Request::create('/api/hospital/requests', 'POST', [
            'blood_type' => 'A+',
            'units_required' => 2,
            'urgency' => 'urgent',
        ]);
        $createRequest->setUserResolver(fn (): User => $hospitalUser->fresh()->load('hospital'));

        $createResponse = app(HospitalController::class)->storeRequest($createRequest);
        $createPayload = $createResponse->getData(true);

        $this->assertSame(201, $createResponse->getStatusCode());
        $this->assertSame('Emergency request broadcast successfully.', $createPayload['message']);
        $this->assertSame(1, $createPayload['notified_donors_count']);

        $this->assertDatabaseHas('emergency_requests', [
            'hospital_id' => $hospital->id,
            'blood_type' => 'A+',
        ]);

        $this->assertDatabaseCount('notifications', 1);

        $notificationsRequest = Request::create('/api/notifications', 'GET');
        $notificationsRequest->setUserResolver(fn (): User => $matchedDonorUser->fresh()->load('donor'));

        $notificationsResponse = app(NotificationController::class)->index($notificationsRequest);
        $notificationsPayload = $notificationsResponse->getData(true);

        $this->assertSame(200, $notificationsResponse->getStatusCode());
        $this->assertSame('New Blood Request', $notificationsPayload['notifications'][0]['title']);

        $payload = $notificationsPayload['notifications'][0] ?? null;

        $this->assertNotNull($payload);
        $this->assertStringContainsString('Htet Hospital', $payload['body']);
        $this->assertStringContainsString('A+', $payload['body']);
        $this->assertNull($payload['read_at']);
    }
}
