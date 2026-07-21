<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Donor;
use App\Models\Hospital;
use App\Models\Patient;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Schema;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    // Register a donor account and create the linked donor profile used by donor dashboards.
    public function registerDonor(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255', 'unique:users,email'],
            'phone' => ['required', 'string', 'max:30', 'unique:users,phone'],
            'password' => ['required', 'string', 'min:8'],
            'blood_group' => ['required', Rule::in($this->bloodGroups())],
            'township' => ['required', 'string', 'max:255'],
            'latitude' => ['nullable', 'numeric', 'between:-90,90'],
            'longitude' => ['nullable', 'numeric', 'between:-180,180'],
        ]);

        $user = DB::transaction(function () use ($validated): User {
            $user = User::create([
                'name' => $validated['name'],
                'email' => $validated['email'],
                'phone' => $validated['phone'],
                'password' => $validated['password'],
                'role' => User::ROLE_DONOR,
                'status' => 'active',
            ]);

            $user->donor()->create([
                'blood_type' => $validated['blood_group'],
                'general_location' => $validated['township'],
                'latitude' => $validated['latitude'] ?? null,
                'longitude' => $validated['longitude'] ?? null,
                'is_eligible' => true,
                'availability_status' => 'available',
                'total_donations' => 0,
                'reward_points' => 0,
                'email_notifications' => true,
                'location_sharing' => true,
                'consented_at' => now(),
            ]);

            return $user;
        });

        return $this->authenticatedResponse($user->load('donor'), 'Donor account created successfully.');
    }

    public function registerPatient(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255', 'unique:users,email'],
            'phone' => ['required', 'string', 'max:30', 'unique:users,phone'],
            'password' => ['required', 'string', 'min:8'],
            'required_blood_group' => ['required', Rule::in($this->bloodGroups())],
            'township' => ['required', 'string', 'max:255'],
            'request_note' => ['nullable', 'string', 'max:1000'],
        ]);

        $user = DB::transaction(function () use ($validated): User {
            $user = User::create([
                'name' => $validated['name'],
                'email' => $validated['email'],
                'phone' => $validated['phone'],
                'password' => $validated['password'],
                'role' => User::ROLE_PATIENT,
                'status' => 'active',
            ]);

            $patientProfile = [
                'needed_blood_type' => $validated['required_blood_group'],
            ];

            if (Schema::hasColumn('patients', 'township')) {
                $patientProfile['township'] = $validated['township'];
            }

            if (Schema::hasColumn('patients', 'request_note')) {
                $patientProfile['request_note'] = $validated['request_note'] ?? null;
            }

            $user->patient()->create($patientProfile);

            return $user;
        });

        return $this->authenticatedResponse($user->load('patient'), 'Patient account created successfully.');
    }

    // Register a hospital account in pending status so admin approval can happen later.
    public function registerHospital(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'hospital_name' => ['required', 'string', 'max:255'],
            'license_number' => ['required', 'string', 'max:100', 'unique:hospitals,license_number'],
            'email' => ['required', 'email', 'max:255', 'unique:users,email'],
            'phone' => ['required', 'string', 'max:30', 'unique:users,phone'],
            'address' => ['required', 'string', 'max:1000'],
            'password' => ['required', 'string', 'min:8'],
        ]);

        $user = DB::transaction(function () use ($validated): User {
            $user = User::create([
                'name' => $validated['hospital_name'],
                'email' => $validated['email'],
                'phone' => $validated['phone'],
                'password' => $validated['password'],
                'role' => User::ROLE_HOSPITAL,
                'status' => 'pending',
            ]);

            $hospitalProfile = [
                'hospital_name' => $validated['hospital_name'],
                'license_number' => $validated['license_number'],
                'address' => $validated['address'],
                'approval_status' => 'pending',
                'approved_by_user_id' => null,
                'approved_at' => null,
            ];

            if (Schema::hasColumn('hospitals', 'rejection_reason')) {
                $hospitalProfile['rejection_reason'] = null;
            }

            $user->hospital()->create($hospitalProfile);

            return $user;
        });

        return $this->authenticatedResponse($user->load('hospital'), 'Hospital account created successfully.');
    }

    // Validate login credentials and return the Sanctum token plus role-aware profile data.
    public function login(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'email' => ['required', 'email'],
            'password' => ['required', 'string'],
        ]);

        $user = User::with(['donor', 'patient', 'hospital'])->where('email', $validated['email'])->first();

        if (! $user || ! Hash::check($validated['password'], $user->password)) {
            throw ValidationException::withMessages([
                'email' => ['The provided credentials are incorrect.'],
            ]);
        }

        return $this->authenticatedResponse($user, 'Login successful.', 200);
    }

    public function logout(Request $request): JsonResponse
    {
        $request->user()->currentAccessToken()?->delete();

        return response()->json([
            'message' => 'Logged out successfully.',
        ]);
    }

    public function me(Request $request): JsonResponse
    {
        return response()->json([
            'user' => $request->user()->load(['donor', 'patient', 'hospital']),
        ]);
    }

    private function authenticatedResponse(User $user, string $message, int $status = 201): JsonResponse
    {
        $token = $user->createToken('lifeblood-api')->plainTextToken;

        return response()->json([
            'message' => $message,
            'token' => $token,
            'user' => $user,
        ], $status);
    }

    private function bloodGroups(): array
    {
        return ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'];
    }
}
