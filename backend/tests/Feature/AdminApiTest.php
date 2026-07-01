<?php

namespace Tests\Feature;

use App\Http\Controllers\Api\AdminController;
use App\Http\Middleware\AdminMiddleware;
use App\Models\Hospital;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;
use Tests\TestCase;

class AdminApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_can_access_dashboard(): void
    {
        $this->createUser('admin@example.com', User::ROLE_ADMIN);

        $response = app(AdminController::class)->dashboard();

        $payload = $this->decodeJsonResponse($response);

        $this->assertSame(200, $response->getStatusCode());
        $this->assertArrayHasKey('total_users', $payload);
        $this->assertArrayHasKey('total_donors', $payload);
        $this->assertArrayHasKey('total_patients', $payload);
        $this->assertArrayHasKey('total_hospitals', $payload);
        $this->assertArrayHasKey('verified_hospitals', $payload);
        $this->assertArrayHasKey('pending_hospitals', $payload);
        $this->assertArrayHasKey('active_requests', $payload);
        $this->assertArrayHasKey('critical_requests', $payload);
        $this->assertArrayHasKey('total_donations', $payload);
        $this->assertArrayHasKey('recent_users', $payload);
        $this->assertArrayHasKey('recent_activities', $payload);
    }

    public function test_non_admin_user_gets_forbidden_response(): void
    {
        $user = $this->createUser('donor@example.com', User::ROLE_DONOR);
        $request = Request::create('/api/admin/dashboard', 'GET');
        $request->setUserResolver(fn (): User => $user);

        $response = app(AdminMiddleware::class)->handle($request, fn () => response()->json(['ok' => true]));
        $payload = $this->decodeJsonResponse($response);

        $this->assertSame(403, $response->getStatusCode());
        $this->assertSame('Unauthorized.', $payload['message']);
    }

    public function test_admin_can_approve_hospital(): void
    {
        $admin = $this->createUser('admin@example.com', User::ROLE_ADMIN);
        $hospitalUser = $this->createUser('hospital@example.com', User::ROLE_HOSPITAL, 'pending');

        $hospital = Hospital::create([
            'user_id' => $hospitalUser->id,
            'hospital_name' => 'City General',
            'license_number' => 'MED-2001',
            'address' => 'Downtown',
            'approval_status' => 'pending',
        ]);

        $request = Request::create("/api/admin/hospitals/{$hospital->id}/approve", 'PUT');
        $request->setUserResolver(fn (): User => $admin);

        $response = app(AdminController::class)->approveHospital($request, $hospital);
        $payload = $this->decodeJsonResponse($response);

        $this->assertSame(200, $response->getStatusCode());
        $this->assertSame('Hospital approved successfully.', $payload['message']);

        $this->assertSame('approved', $hospital->fresh()->approval_status);
        $this->assertSame('active', $hospitalUser->fresh()->status);
    }

    private function createUser(string $email, string $role, string $status = 'active'): User
    {
        return User::create([
            'name' => ucfirst($role).' User',
            'email' => $email,
            'phone' => '09'.str_pad((string) random_int(0, 999999999), 9, '0', STR_PAD_LEFT),
            'password' => 'password123',
            'role' => $role,
            'status' => $status,
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    private function decodeJsonResponse(Response $response): array
    {
        $content = $response->getContent();

        $this->assertNotFalse($content);

        $decoded = json_decode($content, true);

        $this->assertIsArray($decoded);

        return $decoded;
    }
}
