<?php

use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return response()->json([
        'application' => config('app.name'),
        'message' => 'LifeBlood backend is running.',
        'api' => url('/api/v1/status'),
    ]);
});
