<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Donor;
use App\Models\EmergencyRequest;
use App\Models\User;
use App\Services\BloodRequestService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Validation\Rule;

class DonorController extends Controller
{
    public function __construct(
        private readonly BloodRequestService $bloodRequestService,
    ) {
    }

    // Build the donor dashboard response with profile, request, completion, and donation sections.
    public function dashboard(Request $request): JsonResponse
    {
        $user = $request->user()->load('donor');
        $donor = $user->donor;
        $history = $this->donationHistory($user, $donor);
        $requests = $this->nearbyRequests($donor);
        $acceptedRequests = $this->acceptedRequests($user, $donor);
        $notifications = $this->notifications($user);

        return response()->json([
            'user' => $user,
            'donor' => $donor,
            'summary' => [
                'blood_group' => $donor?->blood_type,
                'availability_status' => $donor?->availability_status ?? 'available',
                'total_donations' => $donor?->total_donations ?? count($history),
                'lives_saved' => ($donor?->total_donations ?? count($history)) * 3,
                'pending_requests' => count($requests),
                'last_donation_date' => $this->formatDate($donor?->last_donation_date),
                'next_eligible_date' => $this->formatDate($donor?->next_eligible_date),
                'days_until_eligible' => $this->daysUntilEligible($donor?->next_eligible_date),
                'eligibility_progress' => $this->eligibilityProgress($donor?->next_eligible_date, $donor?->last_donation_date),
                'reward_points' => $donor?->reward_points ?? 0,
                'is_eligible' => (bool) ($donor?->is_eligible ?? true),
            ],
            'donation_trends' => $this->donationTrends($history, $donor),
            'nearby_requests' => $requests,
            'accepted_requests' => $acceptedRequests,
            'completed_requests' => array_values(array_filter(
                $acceptedRequests,
                fn (array $request): bool => strtolower((string) ($request['raw_status'] ?? '')) === 'completed',
            )),
            'donations' => $history,
            'donation_history' => $history,
            'notifications' => $notifications,
        ]);
    }

    public function requests(Request $request): JsonResponse
    {
        $user = $request->user()->load('donor');
        $donor = $user->donor;

        return response()->json([
            'available_requests' => $this->nearbyRequests($donor, 20),
            'received_requests' => $donor ? $this->bloodRequestService->donorRequests($donor) : [],
            'accepted_requests' => $this->acceptedRequests($user, $donor),
        ]);
    }

    // Return completed donation history for the logged-in donor.
    public function donations(Request $request): JsonResponse
    {
        $user = $request->user()->load('donor');
        $donor = $user->donor;

        return response()->json([
            'user' => $user,
            'donor' => $donor,
            'donations' => $this->donationHistory($user, $donor, 50),
        ]);
    }

    // Return approved hospitals with coordinates for the donor Search Hospital map.
    public function hospitals(Request $request): JsonResponse
    {
        $user = $request->user();

        return response()->json([
            'user' => $user,
            'hospitals' => $this->approvedHospitals(),
        ]);
    }

    // Let the donor accept an available blood request without duplicating the response record.
    public function acceptRequest(Request $request, int $requestId): JsonResponse
    {
        $user = $request->user()->load('donor');
        $donor = $user->donor;

        if (! $donor) {
            return response()->json([
                'message' => 'Donor profile not found.',
            ], JsonResponse::HTTP_UNPROCESSABLE_ENTITY);
        }

        $directRequest = EmergencyRequest::query()
            ->with(['hospital.user', 'donor.user'])
            ->where('id', $requestId)
            ->where('donor_id', $donor->id)
            ->first();

        if ($directRequest) {
            $updatedRequest = $this->bloodRequestService->acceptRequest($directRequest, $donor);

            return response()->json([
                'message' => 'Blood request accepted successfully.',
                'request' => $updatedRequest,
                'received_requests' => $this->bloodRequestService->donorRequests($donor),
            ]);
        }

        if (! $this->hasTable('emergency_requests')) {
            return response()->json([
                'message' => 'Emergency request table is not available in this schema.',
            ], JsonResponse::HTTP_UNPROCESSABLE_ENTITY);
        }

        $requestRow = DB::table('emergency_requests')->where('id', $requestId)->first();

        if (! $requestRow) {
            return response()->json([
                'message' => 'Blood request not found.',
            ], JsonResponse::HTTP_NOT_FOUND);
        }

        if ($this->hasTable('request_responses')) {
            $existing = DB::table('request_responses')
                ->where('emergency_request_id', $requestId)
                ->where('donor_id', $donor->id)
                ->exists();

            if ($existing) {
                return response()->json([
                    'message' => 'You already accepted this blood request.',
                ], JsonResponse::HTTP_UNPROCESSABLE_ENTITY);
            }

            $payload = [
                'emergency_request_id' => $requestId,
                'donor_id' => $donor->id,
                'status' => 'accepted',
            ];

            if ($this->hasColumn('request_responses', 'hospital_id') && $this->hasColumn('emergency_requests', 'hospital_id')) {
                $payload['hospital_id'] = $requestRow->hospital_id ?? null;
            }

            if ($this->hasColumn('request_responses', 'eta_minutes')) {
                $payload['eta_minutes'] = $this->estimateEtaMinutes(
                    $donor->latitude,
                    $donor->longitude,
                    $requestRow->latitude ?? null,
                    $requestRow->longitude ?? null,
                );
            }

            if ($this->hasColumn('request_responses', 'created_at')) {
                $payload['created_at'] = now();
            }

            if ($this->hasColumn('request_responses', 'updated_at')) {
                $payload['updated_at'] = now();
            }

            DB::table('request_responses')->insert($payload);
        }

        if ($this->hasColumn('emergency_requests', 'status')) {
            $status = strtolower((string) ($requestRow->status ?? 'open'));

            if (in_array($status, ['open', 'active'], true)) {
                DB::table('emergency_requests')
                    ->where('id', $requestId)
                    ->update([
                        'status' => 'pending',
                        ...($this->hasColumn('emergency_requests', 'updated_at') ? ['updated_at' => now()] : []),
                    ]);
            }
        }

        return response()->json([
            'message' => 'Blood request accepted successfully.',
            'accepted_requests' => $this->acceptedRequests($user->fresh()->load('donor'), $donor->fresh()),
        ]);
    }

    // Let the donor reject only a direct request that was sent to their donor profile.
    public function rejectRequest(Request $request, int $requestId): JsonResponse
    {
        $user = $request->user()->load('donor');
        $donor = $user->donor;

        if (! $donor) {
            return response()->json([
                'message' => 'Donor profile not found.',
            ], JsonResponse::HTTP_UNPROCESSABLE_ENTITY);
        }

        $directRequest = EmergencyRequest::query()
            ->with(['hospital.user', 'donor.user'])
            ->where('id', $requestId)
            ->where('donor_id', $donor->id)
            ->first();

        if (! $directRequest) {
            return response()->json([
                'message' => 'Blood request not found.',
            ], JsonResponse::HTTP_NOT_FOUND);
        }

        $updatedRequest = $this->bloodRequestService->rejectRequest($directRequest, $donor);

        return response()->json([
            'message' => 'Blood request rejected successfully.',
            'request' => $updatedRequest,
            'received_requests' => $this->bloodRequestService->donorRequests($donor),
        ]);
    }

    // Save donor profile details used by dashboard cards, matching, and hospital map routing.
    public function updateProfile(Request $request): JsonResponse
    {
        $user = $request->user()->load('donor');

        if (! $user->donor) {
            return response()->json([
                'message' => 'Donor profile not found.',
            ], JsonResponse::HTTP_UNPROCESSABLE_ENTITY);
        }

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255', Rule::unique('users', 'email')->ignore($user->id)],
            'phone' => ['required', 'string', 'max:30', Rule::unique('users', 'phone')->ignore($user->id)],
            'blood_type' => ['required', Rule::in($this->bloodGroups())],
            'general_location' => ['required', 'string', 'max:255'],
            'contact_address' => ['nullable', 'string', 'max:1000'],
            'latitude' => ['nullable', 'numeric', 'between:-90,90'],
            'longitude' => ['nullable', 'numeric', 'between:-180,180'],
            'email_notifications' => ['nullable', 'boolean'],
            'location_sharing' => ['nullable', 'boolean'],
        ]);

        $user->update([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'phone' => $validated['phone'],
        ]);

        // Keep donor-specific settings and saved map coordinates together on the donor profile.
        $user->donor->update([
            'blood_type' => $validated['blood_type'],
            'general_location' => $validated['general_location'],
            'contact_address' => $validated['contact_address'] ?? null,
            'latitude' => $validated['latitude'] ?? null,
            'longitude' => $validated['longitude'] ?? null,
            'email_notifications' => $validated['email_notifications'] ?? $user->donor->email_notifications,
            'location_sharing' => $validated['location_sharing'] ?? $user->donor->location_sharing,
        ]);

        return response()->json([
            'message' => 'Donor profile updated successfully.',
            'user' => $user->fresh()->load('donor'),
        ]);
    }

    public function updateAvailability(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'availability_status' => ['required', 'string', Rule::in(['available', 'unavailable'])],
        ]);

        $user = $request->user()->load('donor');

        if (! $user->donor) {
            return response()->json([
                'message' => 'Donor profile not found.',
            ], JsonResponse::HTTP_UNPROCESSABLE_ENTITY);
        }

        $user->donor->update([
            'availability_status' => $validated['availability_status'],
        ]);

        return response()->json([
            'message' => 'Availability updated successfully.',
            'user' => $user->fresh()->load('donor'),
        ]);
    }

    private function nearbyRequests(?Donor $donor, int $limit = 6): array
    {
        if (! $this->hasTable('emergency_requests')) {
            return [];
        }

        $query = DB::table('emergency_requests');

        if ($this->hasColumn('emergency_requests', 'hospital_id') && $this->hasTable('hospitals')) {
            $query->leftJoin('hospitals', 'emergency_requests.hospital_id', '=', 'hospitals.id');
        }

        $bloodColumn = $this->firstExistingColumn('emergency_requests', ['blood_group', 'needed_blood_type', 'blood_type']);

        if ($bloodColumn && $donor?->blood_type) {
            $query->whereIn($bloodColumn, $this->compatibleBloodGroups($donor->blood_type));
        }

        if ($this->hasColumn('emergency_requests', 'status')) {
            $query->whereIn('status', ['active', 'open', 'pending']);
        }

        if ($donor?->id && $this->hasTable('request_responses') && $this->hasColumn('request_responses', 'donor_id')) {
            $acceptedIds = DB::table('request_responses')
                ->where('donor_id', $donor->id)
                ->pluck('emergency_request_id');

            if ($acceptedIds->isNotEmpty()) {
                $query->whereNotIn('emergency_requests.id', $acceptedIds->all());
            }
        }

        $createdColumn = $this->firstExistingColumn('emergency_requests', ['required_by', 'needed_by', 'created_at', 'id']) ?? 'id';

        return $query
            ->select($this->requestSelectColumns())
            ->orderByDesc($createdColumn)
            ->limit($limit)
            ->get()
            ->map(function (object $row): array {
                $record = (array) $row;
                $priority = strtolower((string) ($record['priority'] ?? 'medium'));
                $needed = $record['blood_group']
                    ?? $record['needed_blood_type']
                    ?? $record['blood_type']
                    ?? 'Unknown';

                return [
                    'id' => $record['id'] ?? null,
                    'hospital' => $record['hospital_name'] ?? 'Hospital request',
                    'distance' => $this->formatDistance($record['distance_km'] ?? null),
                    'urgency' => $this->humanizePriority($priority),
                    'urgency_tone' => in_array($priority, ['critical', 'high'], true) ? 'high' : 'medium',
                    'needed' => $needed,
                    'required_by' => $this->formatRequiredBy($record['required_by'] ?? $record['needed_by'] ?? null),
                    'status' => $record['status'] ?? 'active',
                    'status_tone' => $this->requestStatusTone((string) ($record['status'] ?? 'active')),
                ];
            })
            ->values()
            ->all();
    }

    private function acceptedRequests(User $user, ?Donor $donor): array
    {
        if (! $this->hasTable('request_responses') || ! $donor?->id) {
            return [];
        }

        $query = DB::table('request_responses')
            ->where('request_responses.donor_id', $donor->id);

        if ($this->hasTable('emergency_requests')) {
            $query->leftJoin('emergency_requests', 'request_responses.emergency_request_id', '=', 'emergency_requests.id');
        }

        if ($this->hasTable('hospitals') && $this->hasColumn('emergency_requests', 'hospital_id')) {
            $query->leftJoin('hospitals', 'emergency_requests.hospital_id', '=', 'hospitals.id');
        }

        $sortColumn = $this->qualifiedFirstExistingColumn('request_responses', ['created_at', 'id']) ?? 'request_responses.id';

        return $query
            ->select($this->acceptedRequestSelectColumns())
            ->orderByDesc($sortColumn)
            ->limit(12)
            ->get()
            ->map(function (object $row): array {
                $record = (array) $row;
                $status = strtolower((string) ($record['response_status'] ?? $record['status'] ?? 'accepted'));
                $bloodType = $record['blood_group']
                    ?? $record['needed_blood_type']
                    ?? $record['blood_type']
                    ?? 'Unknown';

                return [
                    'id' => $record['id'] ?? null,
                    'request_id' => $record['emergency_request_id'] ?? null,
                    'request_code' => '#REQ-'.str_pad((string) ($record['emergency_request_id'] ?? 0), 4, '0', STR_PAD_LEFT),
                    'hospital' => $record['hospital_name'] ?? 'Hospital',
                    'blood_type' => $bloodType,
                    'status' => $this->donorResponseStatusLabel($status),
                    'raw_status' => $status,
                    'status_tone' => $this->requestStatusTone($status),
                    'eta_minutes' => $record['eta_minutes'] ?? null,
                    'accepted_at' => $this->formatRelativeTime($record['created_at'] ?? null),
                    'completed_at' => $this->formatDate($record['completed_at'] ?? null),
                ];
            })
            ->values()
            ->all();
    }

    private function donationHistory(User $user, ?Donor $donor, int $limit = 8): array
    {
        if (! $this->hasTable('donations')) {
            return [];
        }

        $query = DB::table('donations');

        if ($this->hasColumn('donations', 'hospital_id') && $this->hasTable('hospitals')) {
            $query->leftJoin('hospitals', 'donations.hospital_id', '=', 'hospitals.id');
        }

        if ($this->hasColumn('donations', 'donor_id') && $donor?->id) {
            $query->where('donations.donor_id', $donor->id);
        } elseif ($this->hasColumn('donations', 'user_id')) {
            $query->where('donations.user_id', $user->id);
        } else {
            return [];
        }

        $sortColumn = $this->firstExistingColumn('donations', ['donated_at', 'donation_date', 'created_at', 'id']) ?? 'id';

        return $query
            ->select($this->donationSelectColumns())
            ->orderByDesc($sortColumn)
            ->limit($limit)
            ->get()
            ->map(function (object $row) use ($donor): array {
                $record = (array) $row;
                $status = strtolower((string) ($record['status'] ?? 'completed'));

                return [
                    'id' => $record['id'] ?? null,
                    'date' => $this->formatDate($record['donated_at'] ?? $record['donation_date'] ?? $record['created_at'] ?? null),
                    'hospital' => $record['hospital_name'] ?? 'Hospital',
                    'blood_group' => $record['blood_group'] ?? $record['blood_type'] ?? $donor?->blood_type ?? 'Unknown',
                    'units' => (int) ($record['units'] ?? 1),
                    'status' => $this->donorDonationStatusLabel($status),
                    'status_tone' => $this->requestStatusTone($status),
                    'reward_points' => 10,
                ];
            })
            ->values()
            ->all();
    }

    private function donationTrends(array $history, ?Donor $donor): array
    {
        $monthLabels = collect(range(5, 0))->reverse()
            ->map(fn (int $offset): string => now()->subMonths($offset)->format('M'))
            ->values();

        $counts = $monthLabels->mapWithKeys(fn (string $month): array => [$month => 0]);

        collect($history)
            ->pluck('date')
            ->filter()
            ->each(function (?string $date) use ($counts): void {
                try {
                    $month = Carbon::parse($date)->format('M');
                } catch (\Throwable) {
                    return;
                }

                if ($counts->has($month)) {
                    $counts[$month] = $counts[$month] + 1;
                }
            });

        if ($counts->sum() === 0 && ($donor?->total_donations ?? 0) > 0) {
            $lastMonth = $monthLabels->last();
            $counts[$lastMonth] = (int) $donor->total_donations;
        }

        return $monthLabels
            ->map(fn (string $month): array => [
                'label' => $month,
                'value' => $counts[$month] ?? 0,
            ])
            ->all();
    }

    private function notifications(User $user): array
    {
        if (! $this->hasTable('notifications')) {
            return [];
        }

        $query = DB::table('notifications');
        $userLinked = false;

        foreach (['user_id', 'recipient_user_id'] as $column) {
            if ($this->hasColumn('notifications', $column)) {
                $query->where($column, $user->id);
                $userLinked = true;
                break;
            }
        }

        if (! $userLinked) {
            return [];
        }

        $sortColumn = $this->firstExistingColumn('notifications', ['created_at', 'id']) ?? 'id';

        return $query
            ->orderByDesc($sortColumn)
            ->limit(6)
            ->get()
            ->map(function (object $row): array {
                $record = (array) $row;
                $message = $record['message'] ?? $record['description'] ?? $record['content'] ?? 'Notification received.';
                $title = $record['title'] ?? $record['subject'] ?? $record['type'] ?? 'Update';

                return [
                    'id' => $record['id'] ?? null,
                    'title' => $title,
                    'body' => $message,
                    'age' => $this->formatRelativeTime($record['created_at'] ?? null),
                    'tone' => $this->notificationTone($record),
                ];
            })
            ->values()
            ->all();
    }

    private function approvedHospitals(): array
    {
        if (! $this->hasTable('hospitals')) {
            return [];
        }

        $query = DB::table('hospitals');

        if ($this->hasTable('users') && $this->hasColumn('hospitals', 'user_id')) {
            $query->leftJoin('users', 'hospitals.user_id', '=', 'users.id');
        }

        if ($this->hasColumn('hospitals', 'approval_status')) {
            $query->where('hospitals.approval_status', 'approved');
        }

        if ($this->hasColumn('hospitals', 'latitude')) {
            $query->whereNotNull('hospitals.latitude');
        }

        if ($this->hasColumn('hospitals', 'longitude')) {
            $query->whereNotNull('hospitals.longitude');
        }

        return $query
            ->select($this->approvedHospitalSelectColumns())
            ->orderBy('hospitals.hospital_name')
            ->get()
            ->map(function (object $row): array {
                $record = (array) $row;

                return [
                    'id' => $record['id'] ?? null,
                    'hospital_name' => $record['hospital_name'] ?? 'Approved Hospital',
                    'license_number' => $record['license_number'] ?? null,
                    'address' => $record['address'] ?? 'Address unavailable',
                    'latitude' => isset($record['latitude']) ? (float) $record['latitude'] : null,
                    'longitude' => isset($record['longitude']) ? (float) $record['longitude'] : null,
                    'approval_status' => $record['approval_status'] ?? 'approved',
                    'email' => $record['email'] ?? null,
                    'phone' => $record['phone'] ?? null,
                ];
            })
            ->filter(fn (array $hospital): bool => $hospital['latitude'] !== null && $hospital['longitude'] !== null)
            ->values()
            ->all();
    }

    private function requestSelectColumns(): array
    {
        return array_values(array_filter([
            'emergency_requests.id',
            $this->selectIfExists('emergency_requests', 'blood_group'),
            $this->selectIfExists('emergency_requests', 'needed_blood_type'),
            $this->selectIfExists('emergency_requests', 'blood_type'),
            $this->selectIfExists('emergency_requests', 'required_by'),
            $this->selectIfExists('emergency_requests', 'needed_by'),
            $this->selectIfExists('emergency_requests', 'status'),
            $this->selectIfExists('emergency_requests', 'priority'),
            $this->selectIfExists('emergency_requests', 'urgency_level', 'priority'),
            $this->selectIfExists('emergency_requests', 'severity', 'priority'),
            $this->selectIfExists('emergency_requests', 'distance_km'),
            $this->selectIfExists('hospitals', 'hospital_name', 'hospital_name'),
        ]));
    }

    private function acceptedRequestSelectColumns(): array
    {
        return array_values(array_filter([
            'request_responses.id',
            $this->selectIfExists('request_responses', 'emergency_request_id'),
            $this->selectIfExists('request_responses', 'status', 'response_status'),
            $this->selectIfExists('request_responses', 'eta_minutes'),
            $this->selectIfExists('request_responses', 'created_at'),
            $this->selectIfExists('request_responses', 'completed_at'),
            $this->selectIfExists('emergency_requests', 'status'),
            $this->selectIfExists('emergency_requests', 'blood_group'),
            $this->selectIfExists('emergency_requests', 'needed_blood_type'),
            $this->selectIfExists('emergency_requests', 'blood_type'),
            $this->selectIfExists('hospitals', 'hospital_name', 'hospital_name'),
        ]));
    }

    private function donationSelectColumns(): array
    {
        return array_values(array_filter([
            'donations.id',
            $this->selectIfExists('donations', 'donated_at'),
            $this->selectIfExists('donations', 'donation_date'),
            $this->selectIfExists('donations', 'created_at'),
            $this->selectIfExists('donations', 'blood_group'),
            $this->selectIfExists('donations', 'blood_type'),
            $this->selectIfExists('donations', 'units'),
            $this->selectIfExists('donations', 'status'),
            $this->selectIfExists('hospitals', 'hospital_name', 'hospital_name'),
        ]));
    }

    private function approvedHospitalSelectColumns(): array
    {
        return array_values(array_filter([
            'hospitals.id',
            $this->selectIfExists('hospitals', 'hospital_name'),
            $this->selectIfExists('hospitals', 'license_number'),
            $this->selectIfExists('hospitals', 'address'),
            $this->selectIfExists('hospitals', 'latitude'),
            $this->selectIfExists('hospitals', 'longitude'),
            $this->selectIfExists('hospitals', 'approval_status'),
            $this->selectIfExists('users', 'email'),
            $this->selectIfExists('users', 'phone'),
        ]));
    }

    private function compatibleBloodGroups(string $bloodType): array
    {
        return match ($bloodType) {
            'O-' => ['O-'],
            'O+' => ['O+', 'O-'],
            'A-' => ['A-', 'O-'],
            'A+' => ['A+', 'A-', 'O+', 'O-'],
            'B-' => ['B-', 'O-'],
            'B+' => ['B+', 'B-', 'O+', 'O-'],
            'AB-' => ['AB-', 'A-', 'B-', 'O-'],
            'AB+' => ['AB+', 'AB-', 'A+', 'A-', 'B+', 'B-', 'O+', 'O-'],
            default => [$bloodType],
        };
    }

    private function bloodGroups(): array
    {
        return ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'];
    }

    private function notificationTone(array $record): string
    {
        $status = strtolower((string) ($record['status'] ?? $record['type'] ?? ''));

        if (str_contains($status, 'critical') || str_contains($status, 'alert')) {
            return 'danger';
        }

        if (str_contains($status, 'success') || str_contains($status, 'complete')) {
            return 'success';
        }

        return 'soft';
    }

    private function formatDistance(mixed $distance): string
    {
        if ($distance === null || $distance === '') {
            return 'Nearby';
        }

        return is_numeric($distance)
            ? number_format((float) $distance, 1).' km away'
            : (string) $distance;
    }

    private function formatRequiredBy(mixed $value): string
    {
        if (! $value) {
            return 'Soon';
        }

        try {
            $date = Carbon::parse($value);

            if ($date->isToday()) {
                return 'Today';
            }

            if ($date->isTomorrow()) {
                return 'Tomorrow';
            }

            return $date->format('M j');
        } catch (\Throwable) {
            return (string) $value;
        }
    }

    private function formatDate(mixed $value): ?string
    {
        if (! $value) {
            return null;
        }

        try {
            return Carbon::parse($value)->format('M d, Y');
        } catch (\Throwable) {
            return (string) $value;
        }
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

    private function humanizePriority(string $priority): string
    {
        return match ($priority) {
            'critical' => 'Critical',
            'high' => 'High Urgency',
            'medium' => 'Medium',
            'low' => 'Low',
            default => ucfirst($priority ?: 'Medium'),
        };
    }

    private function donorResponseStatusLabel(string $status): string
    {
        return match ($status) {
            'completed', 'fulfilled', 'closed' => 'Done',
            default => ucfirst($status),
        };
    }

    private function donorDonationStatusLabel(string $status): string
    {
        return match ($status) {
            'completed', 'fulfilled', 'closed' => 'Completed',
            default => ucfirst($status),
        };
    }

    private function requestStatusTone(string $status): string
    {
        return match (strtolower($status)) {
            'completed', 'fulfilled', 'closed' => 'completed',
            'accepted', 'pending', 'partially fulfilled', 'partial', 'partially_fulfilled' => 'pending',
            default => 'open',
        };
    }

    private function estimateEtaMinutes(mixed $fromLat, mixed $fromLng, mixed $toLat, mixed $toLng): ?int
    {
        if (! is_numeric($fromLat) || ! is_numeric($fromLng) || ! is_numeric($toLat) || ! is_numeric($toLng)) {
            return null;
        }

        $distanceKm = $this->distanceKm((float) $fromLat, (float) $fromLng, (float) $toLat, (float) $toLng);

        return max(4, (int) round($distanceKm * 5));
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

    private function daysUntilEligible(mixed $nextEligibleDate): int
    {
        if (! $nextEligibleDate) {
            return 0;
        }

        try {
            return max(0, now()->startOfDay()->diffInDays(Carbon::parse($nextEligibleDate)->startOfDay(), false));
        } catch (\Throwable) {
            return 0;
        }
    }

    private function eligibilityProgress(mixed $nextEligibleDate, mixed $lastDonationDate): int
    {
        if (! $nextEligibleDate || ! $lastDonationDate) {
            return 100;
        }

        try {
            $last = Carbon::parse($lastDonationDate)->startOfDay();
            $next = Carbon::parse($nextEligibleDate)->startOfDay();
            $today = now()->startOfDay();
            $totalWindow = max(1, $last->diffInDays($next));
            $elapsed = min($totalWindow, max(0, $last->diffInDays($today)));

            return (int) round(($elapsed / $totalWindow) * 100);
        } catch (\Throwable) {
            return 100;
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
}
