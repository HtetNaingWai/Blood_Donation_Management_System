<?php

namespace App\Http\Middleware;

use App\Models\User;
use Closure;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class ApprovedHospitalMiddleware
{
    // Allow only approved hospital accounts to reach protected hospital workflows.
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user()?->loadMissing('hospital');

        if (! $user || $user->role !== User::ROLE_HOSPITAL) {
            return response()->json([
                'message' => 'Unauthorized.',
            ], JsonResponse::HTTP_FORBIDDEN);
        }

        $status = $user->hospital?->approval_status;

        if ($status === 'pending') {
            return response()->json([
                'message' => 'Hospital account is pending admin approval.',
                'status' => 'pending',
            ], JsonResponse::HTTP_FORBIDDEN);
        }

        if ($status === 'rejected') {
            return response()->json([
                'message' => 'Hospital account has been rejected.',
                'status' => 'rejected',
                'rejection_reason' => $user->hospital?->rejection_reason,
            ], JsonResponse::HTTP_FORBIDDEN);
        }

        if ($status !== 'approved') {
            return response()->json([
                'message' => 'Hospital approval status is invalid.',
                'status' => $status,
            ], JsonResponse::HTTP_FORBIDDEN);
        }

        return $next($request);
    }
}
