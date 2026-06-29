<?php

namespace Tests\Feature;

use App\Http\Controllers\Api\AuthController;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Request;
use Tests\TestCase;

class AuthTest extends TestCase
{
    use RefreshDatabase;

    public function test_donor_can_register(): void
    {
        $response = app(AuthController::class)->registerDonor(Request::create('/api/v1/register/donor', 'POST', [
            'name' => 'Donor User',
            'email' => 'donor@example.com',
            'phone' => '09111111111',
            'password' => 'password123',
            'password_confirmation' => 'password123',
            'blood_group' => 'O+',
            'township' => 'Yangon',
        ]));

        $payload = $response->getData(true);

        $this->assertSame(201, $response->getStatusCode());
        $this->assertSame('donor', $payload['user']['role']);
        $this->assertSame('O+', $payload['user']['donor']['blood_type']);
    }

    public function test_patient_can_register(): void
    {
        $response = app(AuthController::class)->registerPatient(Request::create('/api/v1/register/patient', 'POST', [
            'name' => 'Patient User',
            'email' => 'patient@example.com',
            'phone' => '09222222222',
            'password' => 'password123',
            'password_confirmation' => 'password123',
            'required_blood_group' => 'A+',
            'township' => 'Mandalay',
            'request_note' => 'Urgent surgery support',
        ]));

        $payload = $response->getData(true);

        $this->assertSame(201, $response->getStatusCode());
        $this->assertSame('patient', $payload['user']['role']);
        $this->assertSame('A+', $payload['user']['patient']['needed_blood_type']);
    }

    public function test_hospital_can_register_with_pending_status(): void
    {
        $response = app(AuthController::class)->registerHospital(Request::create('/api/v1/register/hospital', 'POST', [
            'hospital_name' => 'St Mary Hospital',
            'license_number' => 'MED-1001',
            'email' => 'hospital@example.com',
            'phone' => '09333333333',
            'address' => 'Downtown medical road',
            'password' => 'password123',
            'password_confirmation' => 'password123',
        ]));

        $payload = $response->getData(true);

        $this->assertSame(201, $response->getStatusCode());
        $this->assertSame('hospital', $payload['user']['role']);
        $this->assertSame('pending', $payload['user']['status']);
        $this->assertSame('pending', $payload['user']['hospital']['approval_status']);
    }

    public function test_user_can_login(): void
    {
        app(AuthController::class)->registerDonor(Request::create('/api/v1/register/donor', 'POST', [
            'name' => 'Login User',
            'email' => 'login@example.com',
            'phone' => '09444444444',
            'password' => 'password123',
            'password_confirmation' => 'password123',
            'blood_group' => 'B+',
            'township' => 'Bahan',
        ]));

        $login = app(AuthController::class)->login(Request::create('/api/v1/login', 'POST', [
            'email' => 'login@example.com',
            'password' => 'password123',
        ]));

        $payload = $login->getData(true);

        $this->assertSame(200, $login->getStatusCode());
        $this->assertNotEmpty($payload['token']);
        $this->assertSame('donor', $payload['user']['role']);
        $this->assertSame('login@example.com', $payload['user']['email']);
    }
}
