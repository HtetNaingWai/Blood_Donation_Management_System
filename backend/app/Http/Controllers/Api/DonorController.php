<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Donor;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Validation\Rule;

class DonorController extends Controller
{
    public function dashboard(Request $request): JsonResponse
    {
        $user = $request->user()->load('donor');
        $donor = $user->donor;
        $history = $this->donationHistory($user, $donor);
        $requests = $this->nearbyRequests($donor);
        $notifications = $this->notifications($user);

        return response()->json([
            'user' => $user,
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
            'donation_history' => $history,
            'notifications' => $notifications,
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

    private function nearbyRequests(?Donor $donor): array
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

        $createdColumn = $this->firstExistingColumn('emergency_requests', ['required_by', 'needed_by', 'created_at', 'id']) ?? 'id';

        return $query
            ->select($this->requestSelectColumns())
            ->orderByDesc($createdColumn)
            ->limit(6)
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
                ];
            })
            ->values()
            ->all();
    }

    private function donationHistory(User $user, ?Donor $donor): array
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
            ->limit(8)
            ->get()
            ->map(function (object $row) use ($donor): array {
                $record = (array) $row;

                return [
                    'id' => $record['id'] ?? null,
                    'date' => $this->formatDate($record['donated_at'] ?? $record['donation_date'] ?? $record['created_at'] ?? null),
                    'hospital' => $record['hospital_name'] ?? 'Hospital',
                    'blood_group' => $record['blood_group'] ?? $record['blood_type'] ?? $donor?->blood_type ?? 'Unknown',
                    'status' => ucfirst(strtolower((string) ($record['status'] ?? 'completed'))),
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

    private function donationSelectColumns(): array
    {
        return array_values(array_filter([
            'donations.id',
            $this->selectIfExists('donations', 'donated_at'),
            $this->selectIfExists('donations', 'donation_date'),
            $this->selectIfExists('donations', 'created_at'),
            $this->selectIfExists('donations', 'blood_group'),
            $this->selectIfExists('donations', 'blood_type'),
            $this->selectIfExists('donations', 'status'),
            $this->selectIfExists('hospitals', 'hospital_name', 'hospital_name'),
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

    private function hasTable(string $table): bool
    {
        return Schema::hasTable($table);
    }

    private function hasColumn(string $table, string $column): bool
    {
        return Schema::hasColumn($table, $column);
    }
}
