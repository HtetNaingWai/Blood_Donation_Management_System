<?php

namespace Tests\Feature;

use App\Http\Controllers\Api\DonorController;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Request;
use Tests\TestCase;

class DonorProfileTest extends TestCase
{
    use RefreshDatabase;

    public function test_donor_can_update_profile(): void
    {
        $user = User::create([
            'name' => 'Donor User',
            'email' => 'donor-profile@example.com',
            'phone' => '09111111111',
            'password' => 'password123',
            'role' => User::ROLE_DONOR,
            'status' => 'active',
        ]);

        $user->donor()->create([
            'blood_type' => 'O+',
            'general_location' => 'Yangon',
            'availability_status' => 'available',
            'is_eligible' => true,
            'total_donations' => 0,
            'reward_points' => 0,
            'email_notifications' => true,
            'location_sharing' => true,
            'consented_at' => now(),
        ]);

        $request = Request::create('/api/donor/profile', 'PUT', [
            'name' => 'Updated Donor',
            'email' => 'updated-donor@example.com',
            'phone' => '09222222222',
            'blood_type' => 'A+',
            'general_location' => 'Mandalay',
            'contact_address' => 'Medical Street',
            'latitude' => 21.9588,
            'longitude' => 96.0891,
            'email_notifications' => false,
            'location_sharing' => true,
        ]);
        $request->setUserResolver(fn (): User => $user->fresh()->load('donor'));

        $response = app(DonorController::class)->updateProfile($request);
        $payload = $response->getData(true);

        $this->assertSame(200, $response->getStatusCode());
        $this->assertSame('Donor profile updated successfully.', $payload['message']);
        $this->assertSame('Updated Donor', $payload['user']['name']);
        $this->assertSame('updated-donor@example.com', $payload['user']['email']);
        $this->assertSame('A+', $payload['user']['donor']['blood_type']);
        $this->assertSame('Mandalay', $payload['user']['donor']['general_location']);
        $this->assertSame('Medical Street', $payload['user']['donor']['contact_address']);
        $this->assertSame('21.9588000', $payload['user']['donor']['latitude']);
        $this->assertSame('96.0891000', $payload['user']['donor']['longitude']);
    }
}
