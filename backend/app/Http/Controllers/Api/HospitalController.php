<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\EmergencyRequest;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Schema;

class HospitalController extends Controller
{
    public function dashboard(Request $request): JsonResponse
    {
        $user = $request->user()->load('hospital');

        $requestCount = 0;

        if (Schema::hasTable('emergency_requests') && Schema::hasColumn('emergency_requests', 'hospital_id')) {
            $requestCount = EmergencyRequest::where('hospital_id', $user->hospital?->id)->count();
        }

        return response()->json([
            'user' => $user,
            'stats' => [
                'total_blood_requests' => $requestCount,
            ],
        ]);
    }
}
