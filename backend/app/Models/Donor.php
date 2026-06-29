<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

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

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
