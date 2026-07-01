<?php

namespace Tests\Feature;

use App\Http\Middleware\ApprovedHospitalMiddleware;
use App\Models\Hospital;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;
use Tests\TestCase;

class HospitalApprovalMiddlewareTest extends TestCase
{
    use RefreshDatabase;

    public function test_pending_hospital_gets_pending_response(): void
    {
        [$user] = $this->createHospitalUserWithStatus('pending');
        $request = Request::create('/api/hospital/dashboard', 'GET');
        $request->setUserResolver(fn (): User => $user);

        $response = app(ApprovedHospitalMiddleware::class)->handle($request, fn () => response()->json(['ok' => true]));
        $payload = $this->decodeJsonResponse($response);

        $this->assertSame(403, $response->getStatusCode());
        $this->assertSame('pending', $payload['status']);
    }

    public function test_rejected_hospital_gets_rejected_response(): void
    {
        [$user] = $this->createHospitalUserWithStatus('rejected', 'Missing license documents');
        $request = Request::create('/api/hospital/dashboard', 'GET');
        $request->setUserResolver(fn (): User => $user);

        $response = app(ApprovedHospitalMiddleware::class)->handle($request, fn () => response()->json(['ok' => true]));
        $payload = $this->decodeJsonResponse($response);

        $this->assertSame(403, $response->getStatusCode());
        $this->assertSame('rejected', $payload['status']);
    }

    public function test_approved_hospital_can_continue(): void
    {
        [$user] = $this->createHospitalUserWithStatus('approved');
        $request = Request::create('/api/hospital/dashboard', 'GET');
        $request->setUserResolver(fn (): User => $user);

        $response = app(ApprovedHospitalMiddleware::class)->handle($request, fn () => response()->json(['ok' => true]));

        $this->assertSame(200, $response->getStatusCode());
    }

    private function createHospitalUserWithStatus(string $status, ?string $reason = null): array
    {
        $user = User::create([
            'name' => 'Hospital User',
            'email' => $status.'@hospital.test',
            'phone' => '09'.str_pad((string) random_int(0, 999999999), 9, '0', STR_PAD_LEFT),
            'password' => 'password123',
            'role' => User::ROLE_HOSPITAL,
            'status' => $status === 'approved' ? 'active' : $status,
        ]);

        $hospital = Hospital::create([
            'user_id' => $user->id,
            'hospital_name' => 'City Hospital',
            'license_number' => 'MED-'.str_pad((string) random_int(0, 9999), 4, '0', STR_PAD_LEFT),
            'address' => 'Medical Street',
            'approval_status' => $status,
            'rejection_reason' => $reason,
        ]);

        return [$user->load('hospital'), $hospital];
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
