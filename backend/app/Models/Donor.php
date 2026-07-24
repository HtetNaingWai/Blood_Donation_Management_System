<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Donor extends Model
{
    protected $fillable = [
        'user_id',
        'blood_type',
        'contact_address',
        'general_location',
        'latitude',
        'longitude',
        'last_donation_date',
        'next_eligible_date',
        'is_eligible',
        'availability_status',
        'total_donations',
        'reward_points',
        'email_notifications',
        'location_sharing',
        'consented_at',
    ];

    protected function casts(): array
    {
        return [
            'latitude' => 'decimal:7',
            'longitude' => 'decimal:7',
            'last_donation_date' => 'date',
            'next_eligible_date' => 'date',
            'is_eligible' => 'boolean',
            'email_notifications' => 'boolean',
            'location_sharing' => 'boolean',
            'consented_at' => 'datetime',
        ];
    }

    // Each donor profile belongs to exactly one user account.
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    // A donor can have many chat conversations with different hospitals.
    public function conversations(): HasMany
    {
        return $this->hasMany(Conversation::class);
    }

    // A donor can receive many direct emergency requests from hospitals.
    public function emergencyRequests(): HasMany
    {
        return $this->hasMany(EmergencyRequest::class);
    }
}
