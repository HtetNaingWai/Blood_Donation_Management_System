<?php

namespace App\Http\Controllers\Api;

use App\Events\BloodRequestCreated;
use App\Http\Controllers\Controller;
use App\Models\Donor;
use App\Models\EmergencyRequest;
use App\Models\Hospital;
use App\Models\User;
use App\Notifications\BloodRequestNotification;
use App\Services\BloodRequestService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Validation\Rule;

class HospitalController extends Controller
{
    public function __construct(
        private readonly BloodRequestService $bloodRequestService,
    ) {
    }

    // Build the hospital dashboard response with request statistics, donor responses, and map points.
    public function dashboard(Request $request): JsonResponse
    {
        $user = $request->user()->load('hospital');
        $hospital = $user->hospital;
        $activeRequests = $this->activeRequests($hospital);
        $recentLog = $this->recentLog($hospital);
        $donorMatches = $this->donorMatches($hospital, $activeRequests);

        return response()->json([
            'user' => $user,
            'hospital' => $hospital,
            'stats' => [
                'total_requests' => count($activeRequests),
                'donors_matched_today' => $this->donorsMatchedToday($hospital, $donorMatches),
                'match_rate' => $this->matchRate($activeRequests, $donorMatches),
                'inventory_units' => $this->inventoryUnits($hospital),
                'urgent_pending' => $this->urgentPending($hospital),
            ],
            'active_requests' => $activeRequests,
            'request_responses' => $this->requestResponses($hospital),
            'recent_log' => $recentLog,
            'donor_heatmap' => [
                'center' => $this->hospitalCenter($hospital),
                'radius_km' => 5,
                'points' => $donorMatches,
            ],
            'matches_in_route' => array_slice($donorMatches, 0, 5),
        ]);
    }

    public function requests(Request $request): JsonResponse
    {
        $hospital = $request->user()->load('hospital')->hospital;

        return response()->json([
            'active_requests' => $this->activeRequests($hospital),
            'direct_requests' => EmergencyRequest::query()
                ->with(['hospital.user', 'donor.user'])
                ->where('hospital_id', $hospital?->id)
                ->whereNotNull('donor_id')
                ->latest()
                ->get(),
            'request_responses' => $this->requestResponses($hospital),
        ]);
    }

    // Send one targeted blood request from the hospital to a selected donor.
    public function sendBloodRequest(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'donor_id' => ['required', 'integer', Rule::exists('donors', 'id')],
            'blood_group' => ['required', Rule::in($this->bloodGroups())],
            'message' => ['required', 'string', 'max:2000'],
            'units_required' => ['nullable', 'integer', 'min:1', 'max:100'],
            'urgency' => ['nullable', Rule::in(['standard', 'urgent', 'critical'])],
        ]);

        $hospital = $request->user()->load('hospital')->hospital;
        $donor = Donor::query()->with('user')->findOrFail($validated['donor_id']);
        $bloodRequest = $this->bloodRequestService->createDirectRequest($hospital, $donor, $validated);

        return response()->json([
            'message' => 'Blood request sent successfully.',
            'request' => $bloodRequest,
        ], JsonResponse::HTTP_CREATED);
    }

    // Return searchable donor records for approved hospitals, including distance and availability metadata.
    public function donors(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'blood_group' => ['nullable', Rule::in($this->bloodGroups())],
            'township' => ['nullable', 'string', 'max:150'],
            'availability' => ['nullable', Rule::in(['available', 'unavailable', 'temporarily_ineligible'])],
            'distance' => ['nullable', 'numeric', 'min:1', 'max:500'],
            'search' => ['nullable', 'string', 'max:150'],
        ]);

        $user = $request->user()->load('hospital');
        $hospital = $user->hospital;
        $donors = $this->searchableDonors($hospital, $validated);

        return response()->json([
            'user' => $user,
            'hospital' => $hospital,
            'filters' => [
                'blood_group' => $validated['blood_group'] ?? null,
                'township' => $validated['township'] ?? null,
                'availability' => $validated['availability'] ?? null,
                'distance' => isset($validated['distance']) ? (float) $validated['distance'] : null,
                'search' => $validated['search'] ?? null,
            ],
            'donors' => $donors,
        ]);
    }

    // Create a new emergency blood request for the logged-in approved hospital.
    public function storeRequest(Request $request): JsonResponse
    {
        if (! $this->hasTable('emergency_requests')) {
            return response()->json([
                'message' => 'Emergency request table is not available in this schema.',
            ], JsonResponse::HTTP_UNPROCESSABLE_ENTITY);
        }

        $validated = $request->validate([
            'blood_type' => ['required', Rule::in($this->bloodGroups())],
            'units_required' => ['required', 'integer', 'min:1', 'max:100'],
            'urgency' => ['required', Rule::in(['standard', 'urgent', 'critical'])],
            'donor_id' => ['nullable', 'integer', Rule::exists('donors', 'id')],
        ]);

        $user = $request->user()->load('hospital');
        $hospital = $user->hospital;
        $payload = [];

        if ($this->hasColumn('emergency_requests', 'hospital_id')) {
            $payload['hospital_id'] = $hospital?->id;
        }

        if ($bloodColumn = $this->firstExistingColumn('emergency_requests', ['blood_group', 'needed_blood_type', 'blood_type'])) {
            $payload[$bloodColumn] = $validated['blood_type'];
        }

        if ($unitsColumn = $this->firstExistingColumn('emergency_requests', ['units_needed', 'units', 'quantity'])) {
            $payload[$unitsColumn] = $validated['units_required'];
        }

        if ($statusColumn = $this->firstExistingColumn('emergency_requests', ['status'])) {
            $payload[$statusColumn] = 'open';
        }

        if ($priorityColumn = $this->firstExistingColumn('emergency_requests', ['priority', 'urgency_level', 'severity'])) {
            $payload[$priorityColumn] = $validated['urgency'];
        }

        if ($requiredByColumn = $this->firstExistingColumn('emergency_requests', ['required_by', 'needed_by'])) {
            $payload[$requiredByColumn] = match ($validated['urgency']) {
                'critical' => now()->addMinutes(45),
                'urgent' => now()->addHours(2),
                default => now()->addDay(),
            };
        }

        if ($this->hasColumn('emergency_requests', 'created_at')) {
            $payload['created_at'] = now();
        }

        if ($this->hasColumn('emergency_requests', 'updated_at')) {
            $payload['updated_at'] = now();
        }

        if ($payload === []) {
            return response()->json([
                'message' => 'Emergency requests cannot be created with the current schema.',
            ], JsonResponse::HTTP_UNPROCESSABLE_ENTITY);
        }

        $requestId = DB::table('emergency_requests')->insertGetId($payload);
        $record = DB::table('emergency_requests')->where('id', $requestId)->first();
        $notifiedDonorsCount = $this->notifyMatchingDonors(
            $hospital,
            $validated['blood_type'],
            $validated['urgency'],
            $requestId,
            $validated['donor_id'] ?? null,
        );

        return response()->json([
            'message' => 'Emergency request broadcast successfully.',
            'selected_donor_id' => $validated['donor_id'] ?? null,
            'notified_donors_count' => $notifiedDonorsCount,
            'request' => $record ? $this->normalizeActiveRequest($record) : null,
        ], JsonResponse::HTTP_CREATED);
    }

    // Confirm a completed donor response and create the final donation record once.
    public function completeResponse(Request $request, int $responseId): JsonResponse
    {
        $user = $request->user()->load('hospital');
        $hospital = $user->hospital;

        if (! $hospital) {
            return response()->json([
                'message' => 'Hospital profile not found.',
            ], JsonResponse::HTTP_UNPROCESSABLE_ENTITY);
        }

        if (! $this->hasTable('request_responses') || ! $this->hasTable('emergency_requests')) {
            return response()->json([
                'message' => 'Donation completion workflow is not available in this schema.',
            ], JsonResponse::HTTP_UNPROCESSABLE_ENTITY);
        }

        $responseRecord = $this->ownedResponseRecord($responseId, $hospital);

        if (! $responseRecord) {
            return response()->json([
                'message' => 'Donor response not found for this hospital.',
            ], JsonResponse::HTTP_NOT_FOUND);
        }

        $status = strtolower((string) ($responseRecord->response_status ?? 'accepted'));

        if (! in_array($status, ['accepted', 'completed'], true)) {
            return response()->json([
                'message' => 'Only accepted donor responses can be completed.',
            ], JsonResponse::HTTP_UNPROCESSABLE_ENTITY);
        }

        if (! $responseRecord->donor_id) {
            return response()->json([
                'message' => 'This donor response cannot be completed because the donor is missing.',
            ], JsonResponse::HTTP_UNPROCESSABLE_ENTITY);
        }

        $workflow = DB::transaction(function () use ($responseId, $responseRecord, $hospital, $status): array {
            $completedAt = now();
            $donation = $this->findDonationByResponseId($responseId);
            $createdDonation = false;

            if ($status !== 'completed') {
                $updatePayload = [
                    'status' => 'completed',
                ];

                if ($this->hasColumn('request_responses', 'completed_at')) {
                    $updatePayload['completed_at'] = $completedAt;
                }

                if ($this->hasColumn('request_responses', 'updated_at')) {
                    $updatePayload['updated_at'] = $completedAt;
                }

                DB::table('request_responses')
                    ->where('id', $responseId)
                    ->update($updatePayload);
            }

            // A completed response should produce exactly one donation record, even if the button is clicked twice.
            if (! $donation && $this->hasTable('donations')) {
                $donationPayload = [
                    'donor_id' => $responseRecord->donor_id,
                    'hospital_id' => $hospital->id,
                    'emergency_request_id' => $responseRecord->emergency_request_id,
                    'blood_type' => in_array((string) ($responseRecord->blood_type ?? ''), $this->bloodGroups(), true)
                        ? $responseRecord->blood_type
                        : 'O+',
                    'units' => $this->resolvedDonationUnits($responseRecord),
                    'donated_at' => $completedAt,
                    'status' => 'completed',
                ];

                if ($this->hasColumn('donations', 'request_response_id')) {
                    $donationPayload['request_response_id'] = $responseId;
                }

                if ($this->hasColumn('donations', 'created_at')) {
                    $donationPayload['created_at'] = $completedAt;
                }

                if ($this->hasColumn('donations', 'updated_at')) {
                    $donationPayload['updated_at'] = $completedAt;
                }

                $donationId = DB::table('donations')->insertGetId($donationPayload);
                $donation = DB::table('donations')->where('id', $donationId)->first();
                $createdDonation = true;
            }

            if ($createdDonation) {
                // The donor recovery fields move together so the dashboard can show the new waiting period immediately.
                DB::table('donors')
                    ->where('id', $responseRecord->donor_id)
                    ->update([
                        'total_donations' => DB::raw('total_donations + 1'),
                        'reward_points' => DB::raw('reward_points + 10'),
                        'last_donation_date' => $completedAt->toDateString(),
                        'next_eligible_date' => $completedAt->copy()->addDays(90)->toDateString(),
                        'is_eligible' => false,
                        'updated_at' => $completedAt,
                    ]);
            }

            $this->syncEmergencyRequestStatus((int) $responseRecord->emergency_request_id);

            return [
                'donation' => $donation,
                'created_donation' => $createdDonation,
            ];
        });

        return response()->json([
            'message' => $workflow['created_donation']
                ? 'Donation confirmed successfully.'
                : 'Donation was already confirmed earlier.',
            'response' => $this->completedResponsePayload($responseId, $hospital),
            'donation' => $this->normalizeDonationRecord($workflow['donation']),
        ]);
    }

    // Save hospital profile details used in hospital dashboards and donor map markers.
    public function updateProfile(Request $request): JsonResponse
    {
        $user = $request->user()->load('hospital');

        if (! $user->hospital) {
            return response()->json([
                'message' => 'Hospital profile not found.',
            ], JsonResponse::HTTP_UNPROCESSABLE_ENTITY);
        }

        $validated = $request->validate([
            'hospital_name' => ['required', 'string', 'max:255'],
            'license_number' => ['required', 'string', 'max:100', Rule::unique('hospitals', 'license_number')->ignore($user->hospital->id)],
            'email' => ['required', 'email', 'max:255', Rule::unique('users', 'email')->ignore($user->id)],
            'phone' => ['required', 'string', 'max:30', Rule::unique('users', 'phone')->ignore($user->id)],
            'address' => ['required', 'string', 'max:1000'],
            'latitude' => ['nullable', 'numeric', 'between:-90,90'],
            'longitude' => ['nullable', 'numeric', 'between:-180,180'],
        ]);

        // Keep the user account name aligned with the hospital facility name for consistent auth/session data.
        $user->update([
            'name' => $validated['hospital_name'],
            'email' => $validated['email'],
            'phone' => $validated['phone'],
        ]);

        $user->hospital->update([
            'hospital_name' => $validated['hospital_name'],
            'license_number' => $validated['license_number'],
            'address' => $validated['address'],
            'latitude' => $validated['latitude'] ?? null,
            'longitude' => $validated['longitude'] ?? null,
        ]);

        return response()->json([
            'message' => 'Hospital profile updated successfully.',
            'user' => $user->fresh()->load('hospital'),
            'hospital' => $user->fresh()->hospital,
        ]);
    }

    private function activeRequests(?Hospital $hospital): array
    {
        if (! $this->hasTable('emergency_requests')) {
            return [];
        }

        $query = DB::table('emergency_requests');

        if ($hospital?->id && $this->hasColumn('emergency_requests', 'hospital_id')) {
            $query->where('hospital_id', $hospital->id);
        }

        if ($this->hasColumn('emergency_requests', 'status')) {
            $query->whereNotIn('status', ['cancelled']);
        }

        $sortColumn = $this->firstExistingColumn('emergency_requests', ['created_at', 'id']) ?? 'id';

        return $query
            ->orderByDesc($sortColumn)
            ->limit(10)
            ->get()
            ->map(fn (object $row): array => $this->normalizeActiveRequest($row, $hospital))
            ->values()
            ->all();
    }

    private function requestResponses(?Hospital $hospital): array
    {
        if (! $this->hasTable('request_responses')) {
            return [];
        }

        $query = DB::table('request_responses');

        if ($hospital?->id && $this->hasColumn('request_responses', 'hospital_id')) {
            $query->where('request_responses.hospital_id', $hospital->id);
        } elseif ($hospital?->id && $this->hasTable('emergency_requests') && $this->hasColumn('emergency_requests', 'hospital_id')) {
            $query->leftJoin('emergency_requests', 'request_responses.emergency_request_id', '=', 'emergency_requests.id')
                ->where('emergency_requests.hospital_id', $hospital->id);
        }

        if ($this->hasTable('donors') && $this->hasColumn('request_responses', 'donor_id')) {
            $query->leftJoin('donors', 'request_responses.donor_id', '=', 'donors.id');
        }

        if ($this->hasTable('users') && $this->hasColumn('donors', 'user_id')) {
            $query->leftJoin('users', 'donors.user_id', '=', 'users.id');
        }

        $sortColumn = $this->qualifiedFirstExistingColumn('request_responses', ['created_at', 'id']) ?? 'request_responses.id';

        return $query
            ->select($this->requestResponseSelectColumns())
            ->orderByDesc($sortColumn)
            ->limit(20)
            ->get()
            ->map(function (object $row): array {
                $record = (array) $row;
                $status = strtolower((string) ($record['response_status'] ?? 'accepted'));

                return [
                    'id' => $record['id'] ?? null,
                    'request_id' => $record['emergency_request_id'] ?? null,
                    'request_code' => '#REQ-'.str_pad((string) ($record['emergency_request_id'] ?? 0), 4, '0', STR_PAD_LEFT),
                    'donor_name' => $record['donor_name'] ?? 'Donor',
                    'blood_type' => $record['blood_type'] ?? 'Unknown',
                    'status' => ucfirst($status),
                    'status_tone' => $this->requestStatusTone($status),
                    'eta_minutes' => $record['eta_minutes'] ?? null,
                    'accepted_at' => $this->formatRelativeTime($record['created_at'] ?? null),
                    'completed_at' => $this->formatRelativeTime($record['completed_at'] ?? null),
                    'can_complete' => $status === 'accepted',
                ];
            })
            ->values()
            ->all();
    }

    private function recentLog(?Hospital $hospital): array
    {
        if (! $this->hasTable('donations')) {
            return [];
        }

        $query = DB::table('donations');

        if ($hospital?->id && $this->hasColumn('donations', 'hospital_id')) {
            $query->where('donations.hospital_id', $hospital->id);
        }

        if ($this->hasColumn('donations', 'donor_id') && $this->hasTable('donors')) {
            $query->leftJoin('donors', 'donations.donor_id', '=', 'donors.id');
        }

        if ($this->hasTable('users') && $this->hasColumn('donors', 'user_id')) {
            $query->leftJoin('users', 'donors.user_id', '=', 'users.id');
        }

        $sortColumn = $this->firstExistingColumn('donations', ['donated_at', 'donation_date', 'created_at', 'id']) ?? 'id';

        return $query
            ->select($this->recentLogSelectColumns())
            ->orderByDesc($sortColumn)
            ->limit(6)
            ->get()
            ->map(function (object $row): array {
                $record = (array) $row;

                return [
                    'id' => $record['id'] ?? null,
                    'donor_name' => $record['donor_name'] ?? 'Donor',
                    'blood_type' => $record['blood_type'] ?? $record['blood_group'] ?? 'Unknown',
                    'units' => $record['units'] ?? $record['units_needed'] ?? 1,
                    'time_ago' => $this->formatRelativeTime($record['created_at'] ?? $record['donated_at'] ?? $record['donation_date'] ?? null),
                    'status' => $record['status'] ?? 'completed',
                ];
            })
            ->values()
            ->all();
    }

    private function donorMatches(?Hospital $hospital, array $activeRequests): array
    {
        if (! $this->hasTable('donors') || ! $this->hasTable('users')) {
            return [];
        }

        $query = DB::table('donors')
            ->join('users', 'donors.user_id', '=', 'users.id')
            ->where('users.role', 'donor');

        if ($this->hasColumn('users', 'status')) {
            $query->where('users.status', 'active');
        }

        if ($this->hasColumn('donors', 'availability_status')) {
            $query->where('donors.availability_status', 'available');
        }

        if ($this->hasColumn('donors', 'is_eligible')) {
            $query->where('donors.is_eligible', true);
        }

        if ($this->hasColumn('donors', 'latitude')) {
            $query->whereNotNull('donors.latitude');
        }

        if ($this->hasColumn('donors', 'longitude')) {
            $query->whereNotNull('donors.longitude');
        }

        $requestedBloodTypes = collect($activeRequests)
            ->pluck('blood_type')
            ->filter()
            ->unique()
            ->values();

        if ($requestedBloodTypes->isNotEmpty()) {
            $query->whereIn('donors.blood_type', $requestedBloodTypes->all());
        }

        $center = $this->hospitalCenter($hospital);

        return $query
            ->select([
                'donors.id',
                'donors.blood_type',
                'donors.latitude',
                'donors.longitude',
                'donors.general_location',
                'users.name',
            ])
            ->limit(20)
            ->get()
            ->map(function (object $row) use ($center): array {
                $record = (array) $row;
                $distance = $this->distanceKm(
                    $center['latitude'],
                    $center['longitude'],
                    (float) $record['latitude'],
                    (float) $record['longitude'],
                );

                return [
                    'id' => $record['id'] ?? null,
                    'name' => $record['name'] ?? 'Donor',
                    'blood_type' => $record['blood_type'] ?? 'Unknown',
                    'latitude' => isset($record['latitude']) ? (float) $record['latitude'] : null,
                    'longitude' => isset($record['longitude']) ? (float) $record['longitude'] : null,
                    'location' => $record['general_location'] ?? 'Unknown area',
                    'distance_km' => round($distance, 1),
                    'distance_label' => round($distance, 1).' km',
                    'eta_minutes' => max(4, (int) round($distance * 5)),
                ];
            })
            ->sortBy('distance_km')
            ->values()
            ->all();
    }

    private function searchableDonors(?Hospital $hospital, array $filters = []): array
    {
        if (! $this->hasTable('donors') || ! $this->hasTable('users')) {
            return [];
        }

        $query = DB::table('donors')
            ->join('users', 'donors.user_id', '=', 'users.id')
            ->where('users.role', 'donor');

        if ($this->hasColumn('users', 'status')) {
            $query->where('users.status', 'active');
        }

        if (! empty($filters['blood_group']) && $this->hasColumn('donors', 'blood_type')) {
            $query->where('donors.blood_type', $filters['blood_group']);
        }

        if (! empty($filters['township']) && $this->hasColumn('donors', 'general_location')) {
            $query->where('donors.general_location', 'like', '%'.$filters['township'].'%');
        }

        if (! empty($filters['availability']) && $this->hasColumn('donors', 'availability_status')) {
            $query->where('donors.availability_status', $filters['availability']);
        }

        if (! empty($filters['search'])) {
            $search = strtolower((string) $filters['search']);

            $query->where(function ($builder) use ($search): void {
                $builder->whereRaw('LOWER(users.name) like ?', ['%'.$search.'%']);

                if ($this->hasColumn('donors', 'blood_type')) {
                    $builder->orWhereRaw('LOWER(donors.blood_type) like ?', ['%'.$search.'%']);
                }

                if ($this->hasColumn('donors', 'general_location')) {
                    $builder->orWhereRaw('LOWER(donors.general_location) like ?', ['%'.$search.'%']);
                }
            });
        }

        $center = $this->hospitalCenter($hospital);

        return $query
            ->select(array_values(array_filter([
                'donors.id',
                $this->selectIfExists('donors', 'blood_type'),
                $this->selectIfExists('donors', 'general_location'),
                $this->selectIfExists('donors', 'latitude'),
                $this->selectIfExists('donors', 'longitude'),
                $this->selectIfExists('donors', 'availability_status'),
                $this->selectIfExists('donors', 'last_donation_date'),
                $this->selectIfExists('users', 'name'),
            ])))
            ->limit(200)
            ->get()
            ->map(function (object $row) use ($center): array {
                $record = (array) $row;
                $latitude = isset($record['latitude']) ? (float) $record['latitude'] : null;
                $longitude = isset($record['longitude']) ? (float) $record['longitude'] : null;
                $distance = ($latitude !== null && $longitude !== null)
                    ? $this->distanceKm($center['latitude'], $center['longitude'], $latitude, $longitude)
                    : null;

                return [
                    'id' => $record['id'] ?? null,
                    'name' => $record['name'] ?? 'Donor',
                    'blood_group' => $record['blood_type'] ?? 'Unknown',
                    'township' => $record['general_location'] ?? 'Unknown area',
                    'latitude' => $latitude,
                    'longitude' => $longitude,
                    'availability' => $record['availability_status'] ?? 'available',
                    'last_donation_date' => $record['last_donation_date'] ?? null,
                    'distance_km' => $distance !== null ? round($distance, 1) : null,
                ];
            })
            ->filter(function (array $donor) use ($filters): bool {
                if (! empty($filters['distance']) && $donor['distance_km'] === null) {
                    return false;
                }

                if (! empty($filters['distance']) && $donor['distance_km'] !== null) {
                    return $donor['distance_km'] <= (float) $filters['distance'];
                }

                return true;
            })
            ->sortBy(fn (array $donor): float => $donor['distance_km'] ?? 999999)
            ->values()
            ->all();
    }

    private function donorsMatchedToday(?Hospital $hospital, array $donorMatches): int
    {
        if (! $this->hasTable('donations')) {
            return min(28, count($donorMatches));
        }

        $query = DB::table('donations');

        if ($hospital?->id && $this->hasColumn('donations', 'hospital_id')) {
            $query->where('hospital_id', $hospital->id);
        }

        if ($createdColumn = $this->firstExistingColumn('donations', ['donated_at', 'donation_date', 'created_at'])) {
            $todayStart = now()->startOfDay();
            $todayEnd = now()->endOfDay();
            $query->whereBetween($createdColumn, [$todayStart, $todayEnd]);
        }

        return (int) $query->count();
    }

    private function matchRate(array $activeRequests, array $donorMatches): int
    {
        if ($activeRequests === []) {
            return $donorMatches === [] ? 0 : 100;
        }

        return min(100, (int) round((count($donorMatches) / max(1, count($activeRequests))) * 100));
    }

    private function inventoryUnits(?Hospital $hospital): int
    {
        if (! $this->hasTable('donations')) {
            return 0;
        }

        $query = DB::table('donations');

        if ($hospital?->id && $this->hasColumn('donations', 'hospital_id')) {
            $query->where('hospital_id', $hospital->id);
        }

        if ($this->hasColumn('donations', 'status')) {
            $query->whereIn('status', ['completed', 'fulfilled', 'stored']);
        }

        if ($unitsColumn = $this->firstExistingColumn('donations', ['units', 'units_collected', 'volume_units'])) {
            return (int) $query->sum($unitsColumn);
        }

        return (int) $query->count();
    }

    private function urgentPending(?Hospital $hospital): int
    {
        if (! $this->hasTable('emergency_requests')) {
            return 0;
        }

        $query = DB::table('emergency_requests');

        if ($hospital?->id && $this->hasColumn('emergency_requests', 'hospital_id')) {
            $query->where('hospital_id', $hospital->id);
        }

        if ($priorityColumn = $this->firstExistingColumn('emergency_requests', ['priority', 'urgency_level', 'severity'])) {
            $query->whereIn($priorityColumn, ['critical', 'urgent', 'high']);
        }

        if ($this->hasColumn('emergency_requests', 'status')) {
            $query->whereNotIn('status', ['completed', 'fulfilled', 'closed', 'cancelled']);
        }

        return (int) $query->count();
    }

    private function normalizeActiveRequest(object $row, ?Hospital $hospital = null): array
    {
        $record = (array) $row;
        $bloodType = $record['blood_group']
            ?? $record['needed_blood_type']
            ?? $record['blood_type']
            ?? 'Unknown';
        $units = $record['units_needed'] ?? $record['units'] ?? $record['quantity'] ?? 0;
        $status = strtolower((string) ($record['status'] ?? 'open'));

        return [
            'id' => $record['id'] ?? null,
            'request_code' => '#REQ-'.str_pad((string) ($record['id'] ?? 0), 4, '0', STR_PAD_LEFT),
            'blood_type' => $bloodType,
            'volume' => (int) $units,
            'status' => ucfirst($status),
            'status_tone' => $this->requestStatusTone($status),
            'priority' => strtolower((string) ($record['priority'] ?? $record['urgency_level'] ?? $record['severity'] ?? 'standard')),
            'time_remaining' => $this->formatTimeRemaining($record['required_by'] ?? $record['needed_by'] ?? null, $status),
            'accepted_donors' => $this->acceptedDonorCount((int) ($record['id'] ?? 0), $hospital),
        ];
    }

    private function acceptedDonorCount(int $requestId, ?Hospital $hospital): int
    {
        if (! $this->hasTable('request_responses') || $requestId === 0) {
            return 0;
        }

        $query = DB::table('request_responses')->where('emergency_request_id', $requestId);

        if ($hospital?->id && $this->hasColumn('request_responses', 'hospital_id')) {
            $query->where('hospital_id', $hospital->id);
        }

        return (int) $query->count();
    }

    private function requestStatusTone(string $status): string
    {
        return match ($status) {
            'completed', 'fulfilled', 'closed' => 'completed',
            'partial', 'partially fulfilled', 'partially_fulfilled' => 'partial',
            default => 'open',
        };
    }

    private function formatTimeRemaining(mixed $value, string $status): string
    {
        if (in_array($status, ['completed', 'fulfilled', 'closed'], true)) {
            return 'Fulfilled';
        }

        if (! $value) {
            return 'Open';
        }

        try {
            $diffMinutes = now()->diffInMinutes(Carbon::parse($value), false);

            if ($diffMinutes <= 0) {
                return 'Due now';
            }

            if ($diffMinutes < 60) {
                return $diffMinutes.' mins';
            }

            $hours = intdiv($diffMinutes, 60);
            $minutes = $diffMinutes % 60;

            return $hours.'h '.($minutes > 0 ? $minutes.'m' : '0m');
        } catch (\Throwable) {
            return 'Open';
        }
    }

    private function recentLogSelectColumns(): array
    {
        return array_values(array_filter([
            'donations.id',
            $this->selectIfExists('donations', 'created_at'),
            $this->selectIfExists('donations', 'donated_at'),
            $this->selectIfExists('donations', 'donation_date'),
            $this->selectIfExists('donations', 'status'),
            $this->selectIfExists('donations', 'units'),
            $this->selectIfExists('donations', 'units_needed'),
            $this->selectIfExists('donors', 'blood_type'),
            $this->selectIfExists('users', 'name', 'donor_name'),
        ]));
    }

    private function requestResponseSelectColumns(): array
    {
        return array_values(array_filter([
            'request_responses.id',
            $this->selectIfExists('request_responses', 'emergency_request_id'),
            $this->selectIfExists('request_responses', 'status', 'response_status'),
            $this->selectIfExists('request_responses', 'eta_minutes'),
            $this->selectIfExists('request_responses', 'created_at'),
            $this->selectIfExists('request_responses', 'completed_at'),
            $this->selectIfExists('donors', 'blood_type'),
            $this->selectIfExists('users', 'name', 'donor_name'),
        ]));
    }

    private function ownedResponseRecord(int $responseId, Hospital $hospital): ?object
    {
        $query = DB::table('request_responses')
            ->leftJoin('emergency_requests', 'request_responses.emergency_request_id', '=', 'emergency_requests.id')
            ->where('request_responses.id', $responseId);

        if ($this->hasColumn('emergency_requests', 'hospital_id')) {
            $query->where('emergency_requests.hospital_id', $hospital->id);
        } elseif ($this->hasColumn('request_responses', 'hospital_id')) {
            $query->where('request_responses.hospital_id', $hospital->id);
        }

        return $query->select(array_values(array_filter([
            'request_responses.id',
            $this->selectIfExists('request_responses', 'donor_id'),
            $this->selectIfExists('request_responses', 'emergency_request_id'),
            $this->selectIfExists('request_responses', 'status', 'response_status'),
            $this->selectIfExists('request_responses', 'completed_at'),
            $this->selectIfExists('emergency_requests', 'hospital_id'),
            $this->selectIfExists('emergency_requests', 'blood_type'),
            $this->selectIfExists('emergency_requests', 'units_needed'),
            $this->selectIfExists('emergency_requests', 'units'),
            $this->selectIfExists('emergency_requests', 'quantity'),
        ])))->first();
    }

    private function findDonationByResponseId(int $responseId): ?object
    {
        if (! $this->hasTable('donations') || ! $this->hasColumn('donations', 'request_response_id')) {
            return null;
        }

        return DB::table('donations')
            ->where('request_response_id', $responseId)
            ->first();
    }

    private function resolvedDonationUnits(object $responseRecord): int
    {
        // Each accepted donor response currently represents one completed donor unit.
        return 1;
    }

    private function syncEmergencyRequestStatus(int $requestId): void
    {
        if ($requestId === 0 || ! $this->hasColumn('emergency_requests', 'status')) {
            return;
        }

        $completedResponses = DB::table('request_responses')
            ->where('emergency_request_id', $requestId)
            ->where('status', 'completed')
            ->count();

        $requestRecord = DB::table('emergency_requests')->where('id', $requestId)->first();

        if (! $requestRecord) {
            return;
        }

        $requiredUnits = max(1, (int) ($requestRecord->units_needed ?? $requestRecord->units ?? $requestRecord->quantity ?? 1));
        $nextStatus = $completedResponses >= $requiredUnits ? 'completed' : 'pending';

        DB::table('emergency_requests')
            ->where('id', $requestId)
            ->update([
                'status' => $nextStatus,
                ...($this->hasColumn('emergency_requests', 'updated_at') ? ['updated_at' => now()] : []),
            ]);
    }

    private function completedResponsePayload(int $responseId, Hospital $hospital): ?array
    {
        return collect($this->requestResponses($hospital))
            ->first(fn (array $response): bool => (int) ($response['id'] ?? 0) === $responseId);
    }

    private function normalizeDonationRecord(?object $donation): ?array
    {
        if (! $donation) {
            return null;
        }

        $record = (array) $donation;

        return [
            'id' => $record['id'] ?? null,
            'donor_id' => $record['donor_id'] ?? null,
            'hospital_id' => $record['hospital_id'] ?? null,
            'emergency_request_id' => $record['emergency_request_id'] ?? null,
            'request_response_id' => $record['request_response_id'] ?? null,
            'blood_type' => $record['blood_type'] ?? null,
            'units' => (int) ($record['units'] ?? 1),
            'status' => ucfirst(strtolower((string) ($record['status'] ?? 'completed'))),
            'donated_at' => $this->formatRelativeTime($record['donated_at'] ?? null),
        ];
    }

    // Notify compatible donor users after the hospital request has been created successfully.
    private function notifyMatchingDonors(
        ?Hospital $hospital,
        string $bloodType,
        string $urgency,
        int $requestId,
        ?int $selectedDonorId = null,
    ): int {
        $donors = $this->matchingDonorUsersForRequest($bloodType, $selectedDonorId);

        if ($donors->isEmpty()) {
            return 0;
        }

        $hospitalName = $hospital?->hospital_name ?: 'Hospital';
        $location = $hospital?->address ?: null;

        $donors->each(function (User $user) use ($requestId, $hospital, $hospitalName, $bloodType, $urgency, $location): void {
            $notification = BloodRequestNotification::newBloodRequest(
                requestId: $requestId,
                hospitalId: (int) ($hospital?->id ?? 0),
                hospitalName: $hospitalName,
                bloodGroup: $bloodType,
                urgency: $urgency,
                location: $location,
            );

            $user->notify($notification);

            // Broadcast instantly so the donor notification bell updates without a refresh when websockets are available.
            event(new BloodRequestCreated(
                $user->id,
                'New Blood Request',
                sprintf(
                    '%s needs %s blood%s%s',
                    $hospitalName,
                    $bloodType,
                    $urgency ? ' ('.$urgency.')' : '',
                    $location ? ' at '.$location : '',
                ),
                $requestId,
                (int) ($hospital?->id ?? 0),
                $hospitalName,
                $bloodType,
            ));
        });

        return $donors->count();
    }

    // Match active and available donors by blood group, and require saved map coordinates when present.
    private function matchingDonorUsersForRequest(string $bloodType, ?int $selectedDonorId = null): Collection
    {
        if (! $this->hasTable('donors') || ! $this->hasTable('users')) {
            return collect();
        }

        $query = User::query()
            ->where('role', User::ROLE_DONOR)
            ->with('donor')
            ->whereHas('donor', function ($builder) use ($bloodType, $selectedDonorId): void {
                if ($this->hasColumn('donors', 'blood_type')) {
                    $builder->where('blood_type', $bloodType);
                }

                if ($selectedDonorId) {
                    $builder->where('id', $selectedDonorId);
                }

                if ($this->hasColumn('donors', 'availability_status')) {
                    $builder->whereIn('availability_status', ['active', 'available']);
                }

                if ($this->hasColumn('donors', 'is_eligible')) {
                    $builder->where('is_eligible', true);
                }

                if ($this->hasColumn('donors', 'latitude')) {
                    $builder->whereNotNull('latitude');
                }

                if ($this->hasColumn('donors', 'longitude')) {
                    $builder->whereNotNull('longitude');
                }
            });

        if ($this->hasColumn('users', 'status')) {
            $query->where('status', 'active');
        }

        return $query
            ->get()
            ->filter(fn (User $user): bool => $user->donor !== null)
            ->values();
    }

    private function hospitalCenter(?Hospital $hospital): array
    {
        return [
            'latitude' => (float) ($hospital?->latitude ?? 16.8409),
            'longitude' => (float) ($hospital?->longitude ?? 96.1735),
        ];
    }

    private function distanceKm(float $lat1, float $lon1, float $lat2, float $lon2): float
    {
        $earthRadius = 6371;
        $latDelta = deg2rad($lat2 - $lat1);
        $lonDelta = deg2rad($lon2 - $lon1);

        $angle = sin($latDelta / 2) * sin($latDelta / 2)
            + cos(deg2rad($lat1)) * cos(deg2rad($lat2))
            * sin($lonDelta / 2) * sin($lonDelta / 2);

        return $earthRadius * (2 * atan2(sqrt($angle), sqrt(1 - $angle)));
    }

    private function formatRelativeTime(mixed $value): string
    {
        if (! $value) {
            return 'Recently';
        }

        try {
            return Carbon::parse($value)->diffForHumans();
        } catch (\Throwable) {
            return 'Recently';
        }
    }

    private function selectIfExists(string $table, string $column, ?string $alias = null): ?string
    {
        if (! $this->hasTable($table) || ! $this->hasColumn($table, $column)) {
            return null;
        }

        return $alias ? sprintf('%s.%s as %s', $table, $column, $alias) : sprintf('%s.%s', $table, $column);
    }

    private function firstExistingColumn(string $table, array $columns): ?string
    {
        return Collection::make($columns)->first(fn (string $column): bool => $this->hasColumn($table, $column));
    }

    private function qualifiedFirstExistingColumn(string $table, array $columns): ?string
    {
        $column = $this->firstExistingColumn($table, $columns);

        return $column ? sprintf('%s.%s', $table, $column) : null;
    }

    private function hasTable(string $table): bool
    {
        return Schema::hasTable($table);
    }

    private function hasColumn(string $table, string $column): bool
    {
        return Schema::hasColumn($table, $column);
    }

    private function bloodGroups(): array
    {
        return ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'];
    }
}
