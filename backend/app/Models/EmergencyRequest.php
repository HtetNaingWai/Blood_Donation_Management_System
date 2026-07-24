<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class EmergencyRequest extends Model
{
    protected $table = 'emergency_requests';

    public const STATUS_PENDING = 'pending';
    public const STATUS_ACCEPTED = 'accepted';
    public const STATUS_REJECTED = 'rejected';
    public const STATUS_COMPLETED = 'completed';
    public const STATUS_CANCELLED = 'cancelled';

    protected $fillable = [
        'hospital_id',
        'donor_id',
        'blood_type',
        'units_needed',
        'status',
        'priority',
        'message',
        'required_by',
    ];

    protected function casts(): array
    {
        return [
            'required_by' => 'datetime',
        ];
    }

    // A blood request belongs to the hospital that created it.
    public function hospital(): BelongsTo
    {
        return $this->belongsTo(Hospital::class);
    }

    // A targeted request may belong to one selected donor.
    public function donor(): BelongsTo
    {
        return $this->belongsTo(Donor::class);
    }
}
