<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\AdminController;
use App\Http\Controllers\Api\DonorController;
use App\Http\Controllers\Api\HospitalController;
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

Route::prefix('admin')
    ->middleware(['auth:sanctum', 'admin'])
    ->group(function (): void {
        Route::get('/dashboard', [AdminController::class, 'dashboard']);
        Route::get('/users', [AdminController::class, 'users']);
        Route::get('/donors', [AdminController::class, 'donors']);
        Route::get('/patients', [AdminController::class, 'patients']);
        Route::get('/hospitals', [AdminController::class, 'hospitals']);
        Route::get('/hospitals/pending', [AdminController::class, 'pendingHospitals']);
        Route::get('/hospitals/approved', [AdminController::class, 'approvedHospitals']);
        Route::get('/hospitals/rejected', [AdminController::class, 'rejectedHospitals']);
        Route::get('/blood-requests', [AdminController::class, 'bloodRequests']);
        Route::get('/audit-logs', [AdminController::class, 'auditLogs']);
        Route::put('/hospitals/{hospital}/approve', [AdminController::class, 'approveHospital']);
        Route::put('/hospitals/{hospital}/reject', [AdminController::class, 'rejectHospital']);
        Route::put('/users/{user}/status', [AdminController::class, 'updateUserStatus']);
    });

Route::prefix('hospital')
    ->middleware(['auth:sanctum', 'hospital.approved'])
    ->group(function (): void {
        Route::get('/dashboard', [HospitalController::class, 'dashboard']);
    });

Route::prefix('donor')
    ->middleware(['auth:sanctum', 'donor'])
    ->group(function (): void {
        Route::get('/dashboard', [DonorController::class, 'dashboard']);
        Route::put('/availability', [DonorController::class, 'updateAvailability']);
    });
