<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\StatusController;
use Illuminate\Support\Facades\Route;

Route::prefix('v1')->group(function (): void {
    Route::get('/status', StatusController::class)->name('api.status');

    Route::post('/register/donor', [AuthController::class, 'registerDonor']);
    Route::post('/register/patient', [AuthController::class, 'registerPatient']);
    Route::post('/register/hospital', [AuthController::class, 'registerHospital']);
    Route::post('/login', [AuthController::class, 'login']);

    Route::middleware('auth:sanctum')->group(function (): void {
        Route::get('/me', [AuthController::class, 'me']);
        Route::post('/logout', [AuthController::class, 'logout']);
    });
});
