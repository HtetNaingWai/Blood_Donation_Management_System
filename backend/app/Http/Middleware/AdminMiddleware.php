<?php

namespace App\Http\Middleware;

use App\Models\User;
use Closure;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class AdminMiddleware
{
    // Allow only admin users to access system management endpoints.
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if (! $user || $user->role !== User::ROLE_ADMIN) {
            return response()->json([
                'message' => 'Unauthorized.',
            ], JsonResponse::HTTP_FORBIDDEN);
        }

        return $next($request);
    }
}
