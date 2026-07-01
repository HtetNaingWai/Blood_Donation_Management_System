<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\Donation;
use App\Models\Donor;
use App\Models\EmergencyRequest;
use App\Models\Hospital;
use App\Models\Patient;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Validation\Rule;

class AdminController extends Controller
{
    public function dashboard(): JsonResponse
    {
        $totalUsers = $this->hasTable('users') ? User::count() : 0;
        $totalDonors = $this->hasTable('donors') ? Donor::count() : 0;
        $totalPatients = $this->hasTable('patients') ? Patient::count() : 0;
        $totalHospitals = $this->hasTable('hospitals') ? Hospital::count() : 0;

        return response()->json([
            'total_users' => $totalUsers,
            'total_donors' => $totalDonors,
            'total_patients' => $totalPatients,
            'total_hospitals' => $totalHospitals,
            'verified_hospitals' => $this->countHospitalsByStatus('approved'),
            'pending_hospitals' => $this->countHospitalsByStatus('pending'),
            'active_requests' => $this->countActiveRequests(),
            'critical_requests' => $this->countCriticalRequests(),
            'total_donations' => $this->hasTable('donations') ? Donation::count() : 0,
            'recent_users' => $this->recentUsers(),
            'recent_activities' => $this->recentActivities(),
        ]);
    }

    public function users(): JsonResponse
    {
        if (! $this->hasTable('users')) {
            return response()->json(['data' => []]);
        }

        $users = User::query()
            ->latest()
            ->limit(50)
            ->get(['id', 'name', 'email', 'phone', 'role', 'status', 'created_at']);

        return response()->json([
            'data' => $users,
        ]);
    }

    public function donors(): JsonResponse
    {
        if (! $this->hasTable('donors')) {
            return response()->json(['data' => []]);
        }

        $donors = Donor::query()
            ->with('user:id,name,email,phone,status,role')
            ->latest()
            ->limit(50)
            ->get();

        return response()->json([
            'data' => $donors,
        ]);
    }

    public function patients(): JsonResponse
    {
        if (! $this->hasTable('patients')) {
            return response()->json(['data' => []]);
        }

        $patients = Patient::query()
            ->with('user:id,name,email,phone,status,role')
            ->latest()
            ->limit(50)
            ->get();

        return response()->json([
            'data' => $patients,
        ]);
    }

    public function hospitals(): JsonResponse
    {
        return $this->hospitalList();
    }

    public function pendingHospitals(): JsonResponse
    {
        return $this->hospitalList('pending');
    }

    public function approvedHospitals(): JsonResponse
    {
        return $this->hospitalList('approved');
    }

    public function rejectedHospitals(): JsonResponse
    {
        return $this->hospitalList('rejected');
    }

    private function hospitalList(?string $status = null): JsonResponse
    {
        if (! $this->hasTable('hospitals')) {
            return response()->json(['data' => []]);
        }

        $query = Hospital::query()
            ->with('user:id,name,email,phone,status,role')
            ->latest();

        if ($status && $this->hasColumn('hospitals', 'approval_status')) {
            $query->where('approval_status', $status);
        }

        $hospitals = $query->limit(50)->get();

        return response()->json([
            'data' => $hospitals,
        ]);
    }

    public function bloodRequests(): JsonResponse
    {
        if (! $this->hasTable('emergency_requests')) {
            return response()->json(['data' => []]);
        }

        $requests = DB::table('emergency_requests')
            ->orderByDesc($this->firstExistingColumn('emergency_requests', ['created_at', 'id']) ?? 'id')
            ->limit(50)
            ->get()
            ->map(fn (object $row): array => $this->normalizeEmergencyRequest($row))
            ->values();

        return response()->json([
            'data' => $requests,
        ]);
    }

    public function auditLogs(): JsonResponse
    {
        if (! $this->hasTable('audit_logs')) {
            return response()->json(['data' => []]);
        }

        $logs = AuditLog::query()
            ->latest($this->firstExistingColumn('audit_logs', ['created_at', 'id']) ?? 'id')
            ->limit(50)
            ->get()
            ->map(fn (AuditLog $log): array => $this->normalizeAuditLog($log->getAttributes()))
            ->values();

        return response()->json([
            'data' => $logs,
        ]);
    }

    public function approveHospital(Request $request, Hospital $hospital): JsonResponse
    {
        if (! $this->hasColumn('hospitals', 'approval_status')) {
            return response()->json([
                'message' => 'Hospital approval workflow is not available in this schema.',
            ], JsonResponse::HTTP_UNPROCESSABLE_ENTITY);
        }

        $approvalPayload = [
            'approval_status' => 'approved',
            'approved_by_user_id' => $request->user()->id,
            'approved_at' => now(),
        ];

        if ($this->hasColumn('hospitals', 'rejection_reason')) {
            $approvalPayload['rejection_reason'] = null;
        }

        $hospital->forceFill($approvalPayload)->save();

        $hospital->user?->update([
            'status' => 'active',
        ]);

        $this->writeAuditLog([
            'user_id' => $request->user()->id,
            'action' => 'hospital_approved',
            'description' => 'Hospital #'.$hospital->id.' approved by admin.',
            'hospital_id' => $hospital->id,
        ]);

        return response()->json([
            'message' => 'Hospital approved successfully.',
            'data' => $hospital->load('user'),
        ]);
    }

    public function rejectHospital(Request $request, Hospital $hospital): JsonResponse
    {
        if (! $this->hasColumn('hospitals', 'approval_status')) {
            return response()->json([
                'message' => 'Hospital approval workflow is not available in this schema.',
            ], JsonResponse::HTTP_UNPROCESSABLE_ENTITY);
        }

        $validated = $request->validate([
            'rejection_reason' => ['nullable', 'string', 'max:2000'],
        ]);

        $rejectionPayload = [
            'approval_status' => 'rejected',
            'approved_by_user_id' => $request->user()->id,
            'approved_at' => null,
        ];

        if ($this->hasColumn('hospitals', 'rejection_reason')) {
            $rejectionPayload['rejection_reason'] = $validated['rejection_reason'] ?? null;
        }

        $hospital->forceFill($rejectionPayload)->save();

        $hospital->user?->update([
            'status' => 'rejected',
        ]);

        $this->writeAuditLog([
            'user_id' => $request->user()->id,
            'action' => 'hospital_rejected',
            'description' => 'Hospital #'.$hospital->id.' rejected by admin.',
            'hospital_id' => $hospital->id,
        ]);

        return response()->json([
            'message' => 'Hospital rejected successfully.',
            'data' => $hospital->load('user'),
        ]);
    }

    public function updateUserStatus(Request $request, User $user): JsonResponse
    {
        $validated = $request->validate([
            'status' => ['required', 'string', Rule::in(['active', 'pending', 'suspended', 'inactive', 'rejected'])],
        ]);

        $user->update([
            'status' => $validated['status'],
        ]);

        return response()->json([
            'message' => 'User status updated successfully.',
            'data' => $user->fresh(),
        ]);
    }

    private function recentUsers(): array
    {
        if (! $this->hasTable('users')) {
            return [];
        }

        return User::query()
            ->latest()
            ->limit(6)
            ->get(['id', 'name', 'email', 'role', 'status', 'created_at'])
            ->map(fn (User $user): array => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'role' => $user->role,
                'status' => $user->status,
                'created_at' => $user->created_at,
            ])
            ->all();
    }

    private function recentActivities(): array
    {
        if ($this->hasTable('audit_logs')) {
            return AuditLog::query()
                ->latest($this->firstExistingColumn('audit_logs', ['created_at', 'id']) ?? 'id')
                ->limit(6)
                ->get()
                ->map(fn (AuditLog $log): array => $this->normalizeAuditLog($log->getAttributes()))
                ->values()
                ->all();
        }

        if (! $this->hasTable('hospitals')) {
            return [];
        }

        return Hospital::query()
            ->with('user:id,name')
            ->latest()
            ->limit(4)
            ->get()
            ->map(function (Hospital $hospital): array {
                return [
                    'id' => $hospital->id,
                    'action' => 'Hospital registration',
                    'description' => sprintf(
                        '%s is awaiting review.',
                        $hospital->hospital_name ?: ($hospital->user?->name ?? 'Hospital account')
                    ),
                    'created_at' => $hospital->created_at,
                ];
            })
            ->all();
    }

    private function countHospitalsByStatus(string $status): int
    {
        if (! $this->hasTable('hospitals') || ! $this->hasColumn('hospitals', 'approval_status')) {
            return 0;
        }

        return Hospital::where('approval_status', $status)->count();
    }

    private function countActiveRequests(): int
    {
        if (! $this->hasTable('emergency_requests')) {
            return 0;
        }

        if ($this->hasColumn('emergency_requests', 'status')) {
            return DB::table('emergency_requests')
                ->whereIn('status', ['active', 'open', 'pending'])
                ->count();
        }

        return EmergencyRequest::count();
    }

    private function countCriticalRequests(): int
    {
        if (! $this->hasTable('emergency_requests')) {
            return 0;
        }

        foreach (['priority', 'urgency_level', 'severity'] as $column) {
            if ($this->hasColumn('emergency_requests', $column)) {
                return DB::table('emergency_requests')
                    ->where($column, 'critical')
                    ->count();
            }
        }

        return 0;
    }

    private function normalizeEmergencyRequest(object $row): array
    {
        $record = (array) $row;

        return [
            'id' => $record['id'] ?? null,
            'blood_group' => $record['blood_group']
                ?? $record['needed_blood_type']
                ?? $record['blood_type']
                ?? null,
            'units_needed' => $record['units_needed'] ?? $record['units'] ?? null,
            'status' => $record['status'] ?? 'unknown',
            'priority' => $record['priority'] ?? $record['urgency_level'] ?? $record['severity'] ?? null,
            'hospital_name' => $record['hospital_name'] ?? null,
            'patient_name' => $record['patient_name'] ?? null,
            'created_at' => $record['created_at'] ?? null,
        ];
    }

    private function normalizeAuditLog(array $record): array
    {
        return [
            'id' => $record['id'] ?? null,
            'user_id' => $record['user_id'] ?? null,
            'action' => $record['action'] ?? $record['event'] ?? $record['type'] ?? 'activity',
            'description' => $record['description'] ?? $record['details'] ?? $record['message'] ?? 'System activity recorded.',
            'created_at' => $record['created_at'] ?? null,
        ];
    }

    private function writeAuditLog(array $payload): void
    {
        if (! $this->hasTable('audit_logs')) {
            return;
        }

        $safePayload = array_filter([
            'user_id' => $this->hasColumn('audit_logs', 'user_id') ? ($payload['user_id'] ?? null) : null,
            'action' => $this->hasColumn('audit_logs', 'action') ? ($payload['action'] ?? null) : null,
            'description' => $this->hasColumn('audit_logs', 'description') ? ($payload['description'] ?? null) : null,
            'hospital_id' => $this->hasColumn('audit_logs', 'hospital_id') ? ($payload['hospital_id'] ?? null) : null,
            'created_at' => $this->hasColumn('audit_logs', 'created_at') ? now() : null,
            'updated_at' => $this->hasColumn('audit_logs', 'updated_at') ? now() : null,
        ], static fn ($value): bool => $value !== null);

        if ($safePayload === []) {
            return;
        }

        AuditLog::query()->create($safePayload);
    }

    private function hasTable(string $table): bool
    {
        return Schema::hasTable($table);
    }

    private function hasColumn(string $table, string $column): bool
    {
        return $this->hasTable($table) && Schema::hasColumn($table, $column);
    }

    private function firstExistingColumn(string $table, array $columns): ?string
    {
        return Collection::make($columns)->first(fn (string $column): bool => $this->hasColumn($table, $column));
    }
}
