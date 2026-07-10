<?php

namespace Tests\Feature;

use App\Http\Controllers\Api\HospitalController;
use App\Models\Hospital;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Request;
use Tests\TestCase;

class HospitalDashboardTest extends TestCase
{
    use RefreshDatabase;

    public function test_approved_hospital_dashboard_returns_expected_keys(): void
    {
        $user = User::create([
            'name' => 'City Hospital',
            'email' => 'hospital-dashboard@example.com',
            'phone' => '09333333333',
            'password' => 'password123',
            'role' => User::ROLE_HOSPITAL,
            'status' => 'active',
        ]);

        $user->hospital()->create([
            'hospital_name' => 'City Hospital',
            'license_number' => 'MED-9001',
            'address' => 'Downtown',
            'approval_status' => 'approved',
        ]);

        $request = Request::create('/api/hospital/dashboard', 'GET');
        $request->setUserResolver(fn (): User => $user->fresh()->load('hospital'));

        $response = app(HospitalController::class)->dashboard($request);
        $payload = $response->getData(true);

        $this->assertSame(200, $response->getStatusCode());
        $this->assertArrayHasKey('user', $payload);
        $this->assertArrayHasKey('hospital', $payload);
        $this->assertArrayHasKey('stats', $payload);
        $this->assertArrayHasKey('active_requests', $payload);
        $this->assertArrayHasKey('recent_log', $payload);
        $this->assertArrayHasKey('donor_heatmap', $payload);
        $this->assertArrayHasKey('matches_in_route', $payload);
    }
}
