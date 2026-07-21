<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\AdminController;
use App\Http\Controllers\Api\DonorController;
use App\Http\Controllers\Api\HospitalController;
use App\Http\Controllers\Api\StatusController;
use Illuminate\Support\Facades\Route;

Route::prefix('v1')->group(function (): void {
    // Public auth and health-check routes used by the React landing page and login forms.
    Route::get('/status', StatusController::class)->name('api.status');

    Route::post('/register/donor', [AuthController::class, 'registerDonor']);
    Route::post('/register/patient', [AuthController::class, 'registerPatient']);
    Route::post('/register/hospital', [AuthController::class, 'registerHospital']);
    Route::post('/login', [AuthController::class, 'login']);

    Route::middleware('auth:sanctum')->group(function (): void {
        Route::get('/me', [AuthController::class, 'me']);
        Route::post('/logout', [AuthController::class, 'logout']);
    });

    // Approved hospital API routes for dashboard data, request creation, profile updates, and donation completion.
    Route::prefix('hospital')
        ->middleware(['auth:sanctum', 'hospital.approved'])
        ->group(function (): void {
            Route::get('/dashboard', [HospitalController::class, 'dashboard']);
            Route::get('/donors', [HospitalController::class, 'donors']);
            Route::get('/requests', [HospitalController::class, 'requests']);
            Route::put('/profile', [HospitalController::class, 'updateProfile']);
            Route::post('/requests', [HospitalController::class, 'storeRequest']);
            Route::put('/responses/{responseId}/complete', [HospitalController::class, 'completeResponse']);
        });

    // Donor-only API routes for dashboard data, hospital map data, request acceptance, and profile updates.
    Route::prefix('donor')
        ->middleware(['auth:sanctum', 'donor'])
        ->group(function (): void {
            Route::get('/dashboard', [DonorController::class, 'dashboard']);
            Route::get('/hospitals', [DonorController::class, 'hospitals']);
            Route::get('/requests', [DonorController::class, 'requests']);
            Route::get('/donations', [DonorController::class, 'donations']);
            Route::post('/requests/{requestId}/accept', [DonorController::class, 'acceptRequest']);
            Route::put('/profile', [DonorController::class, 'updateProfile']);
            Route::put('/availability', [DonorController::class, 'updateAvailability']);
        });
});

// Admin-only API routes for moderation, reporting, and hospital approval workflows.
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

// Legacy non-v1 hospital routes remain in place for compatibility with older clients.
Route::prefix('hospital')
    ->middleware(['auth:sanctum', 'hospital.approved'])
    ->group(function (): void {
        Route::get('/dashboard', [HospitalController::class, 'dashboard']);
        Route::get('/donors', [HospitalController::class, 'donors']);
        Route::get('/requests', [HospitalController::class, 'requests']);
        Route::put('/profile', [HospitalController::class, 'updateProfile']);
        Route::post('/requests', [HospitalController::class, 'storeRequest']);
        Route::put('/responses/{responseId}/complete', [HospitalController::class, 'completeResponse']);
    });

// Legacy non-v1 donor routes remain in place for compatibility with older clients.
Route::prefix('donor')
    ->middleware(['auth:sanctum', 'donor'])
    ->group(function (): void {
        Route::get('/dashboard', [DonorController::class, 'dashboard']);
        Route::get('/hospitals', [DonorController::class, 'hospitals']);
        Route::get('/requests', [DonorController::class, 'requests']);
        Route::get('/donations', [DonorController::class, 'donations']);
        Route::post('/requests/{requestId}/accept', [DonorController::class, 'acceptRequest']);
        Route::put('/profile', [DonorController::class, 'updateProfile']);
        Route::put('/availability', [DonorController::class, 'updateAvailability']);
    });
