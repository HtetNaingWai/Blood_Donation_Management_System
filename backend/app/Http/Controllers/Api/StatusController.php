<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;

class StatusController extends Controller
{
    public function __invoke(): JsonResponse
    {
        return response()->json([
            'application' => config('app.name'),
            'status' => 'API online',
            'environment' => app()->environment(),
            'timestamp' => now()->toIso8601String(),
        ]);
    }
}
