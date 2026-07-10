<?php

namespace Tests\Feature;

use App\Http\Controllers\Api\DonorController;
use App\Models\User;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

class DonorRequestAcceptanceTest extends TestCase
{
    use RefreshDatabase;

    public function test_donor_can_accept_hospital_blood_request(): void
    {
        $this->ensureEmergencyRequestsTable();

        $hospitalUser = User::create([
            'name' => 'City Hospital',
            'email' => 'hospital-acceptance@example.com',
            'phone' => '09333333333',
            'password' => 'password123',
            'role' => User::ROLE_HOSPITAL,
            'status' => 'active',
        ]);

        $hospital = $hospitalUser->hospital()->create([
            'hospital_name' => 'City Hospital',
            'license_number' => 'MED-1009',
            'address' => 'Downtown',
            'approval_status' => 'approved',
        ]);

        $donorUser = User::create([
            'name' => 'Donor User',
            'email' => 'donor-acceptance@example.com',
            'phone' => '09111111111',
            'password' => 'password123',
            'role' => User::ROLE_DONOR,
            'status' => 'active',
        ]);

        $donor = $donorUser->donor()->create([
            'blood_type' => 'O+',
            'general_location' => 'Yangon',
            'latitude' => 16.8409,
            'longitude' => 96.1735,
            'is_eligible' => true,
            'availability_status' => 'available',
            'total_donations' => 0,
            'reward_points' => 0,
            'email_notifications' => true,
            'location_sharing' => true,
            'consented_at' => now(),
        ]);

        $requestId = DB::table('emergency_requests')->insertGetId([
            'hospital_id' => $hospital->id,
            'blood_group' => 'O+',
            'units_needed' => 2,
            'status' => 'open',
            'priority' => 'urgent',
            'required_by' => now()->addHour(),
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $request = Request::create("/api/donor/requests/{$requestId}/accept", 'POST');
        $request->setUserResolver(fn (): User => $donorUser->fresh()->load('donor'));

        $response = app(DonorController::class)->acceptRequest($request, $requestId);
        $payload = $response->getData(true);

        $this->assertSame(200, $response->getStatusCode());
        $this->assertSame('Blood request accepted successfully.', $payload['message']);
        $this->assertDatabaseHas('request_responses', [
            'emergency_request_id' => $requestId,
            'donor_id' => $donor->id,
            'hospital_id' => $hospital->id,
            'status' => 'accepted',
        ]);
    }

    private function ensureEmergencyRequestsTable(): void
    {
        if (Schema::hasTable('emergency_requests')) {
            return;
        }

        Schema::create('emergency_requests', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('hospital_id')->nullable()->constrained('hospitals')->nullOnDelete();
            $table->string('blood_group', 10)->nullable();
            $table->unsignedInteger('units_needed')->nullable();
            $table->string('status', 40)->default('open');
            $table->string('priority', 40)->nullable();
            $table->timestamp('required_by')->nullable();
            $table->timestamps();
        });
    }
}
