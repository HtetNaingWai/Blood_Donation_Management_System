<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Donation extends Model
{
    protected $table = 'donations';

    protected $fillable = [
        'donor_id',
        'hospital_id',
        'emergency_request_id',
        'request_response_id',
        'blood_type',
        'units',
        'donated_at',
        'status',
    ];

    protected function casts(): array
    {
        return [
            'units' => 'integer',
            'donated_at' => 'datetime',
        ];
    }
}
