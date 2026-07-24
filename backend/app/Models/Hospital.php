<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Hospital extends Model
{
    protected $fillable = [
        'user_id',
        'hospital_name',
        'license_number',
        'address',
        'latitude',
        'longitude',
        'approval_status',
        'rejection_reason',
        'approved_by_user_id',
        'approved_at',
    ];

    protected function casts(): array
    {
        return [
            'latitude' => 'decimal:7',
            'longitude' => 'decimal:7',
            'approved_at' => 'datetime',
        ];
    }

    // Each hospital profile belongs to exactly one user account.
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    // A hospital can have many donor conversations.
    public function conversations(): HasMany
    {
        return $this->hasMany(Conversation::class);
    }

    // A hospital can create many emergency requests.
    public function emergencyRequests(): HasMany
    {
        return $this->hasMany(EmergencyRequest::class);
    }
}
