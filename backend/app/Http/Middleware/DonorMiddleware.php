<?php

namespace App\Http\Middleware;

use App\Models\User;
use Closure;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class DonorMiddleware
{
    // Allow only donor accounts to access donor dashboard and request endpoints.
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if (! $user || $user->role !== User::ROLE_DONOR) {
            return response()->json([
                'message' => 'Unauthorized.',
            ], JsonResponse::HTTP_FORBIDDEN);
        }

        return $next($request);
    }
}
