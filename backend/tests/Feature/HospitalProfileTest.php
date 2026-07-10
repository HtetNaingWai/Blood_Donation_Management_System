<?php

namespace Tests\Feature;

use App\Http\Controllers\Api\HospitalController;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Request;
use Tests\TestCase;

class HospitalProfileTest extends TestCase
{
    use RefreshDatabase;

    public function test_hospital_can_update_profile(): void
    {
        $user = User::create([
            'name' => 'City Hospital',
            'email' => 'hospital-profile@example.com',
            'phone' => '09333333333',
            'password' => 'password123',
            'role' => User::ROLE_HOSPITAL,
            'status' => 'active',
        ]);

        $user->hospital()->create([
            'hospital_name' => 'City Hospital',
            'license_number' => 'MED-7001',
            'address' => 'Old Address',
            'approval_status' => 'approved',
        ]);

        $request = Request::create('/api/hospital/profile', 'PUT', [
            'hospital_name' => 'St. Jude Medical Center',
            'license_number' => 'MED-8002',
            'email' => 'updated-hospital@example.com',
            'phone' => '09444444444',
            'address' => 'Updated Clinical Road',
            'latitude' => 16.8661,
            'longitude' => 96.1951,
        ]);
        $request->setUserResolver(fn (): User => $user->fresh()->load('hospital'));

        $response = app(HospitalController::class)->updateProfile($request);
        $payload = $response->getData(true);

        $this->assertSame(200, $response->getStatusCode());
        $this->assertSame('Hospital profile updated successfully.', $payload['message']);
        $this->assertSame('St. Jude Medical Center', $payload['user']['name']);
        $this->assertSame('updated-hospital@example.com', $payload['user']['email']);
        $this->assertSame('MED-8002', $payload['hospital']['license_number']);
        $this->assertSame('Updated Clinical Road', $payload['hospital']['address']);
        $this->assertSame('16.8661000', $payload['hospital']['latitude']);
        $this->assertSame('96.1951000', $payload['hospital']['longitude']);
    }
}
