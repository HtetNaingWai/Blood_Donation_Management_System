<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Message extends Model
{
    protected $fillable = [
        'conversation_id',
        'sender_id',
        'sender_role',
        'message',
        'read_at',
    ];

    protected function casts(): array
    {
        return [
            'read_at' => 'datetime',
        ];
    }

    // Each message belongs to one conversation thread.
    public function conversation(): BelongsTo
    {
        return $this->belongsTo(Conversation::class);
    }

    // Each message belongs to the user who sent it.
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'sender_id');
    }

    // Alias the sender relationship so chat code can read more naturally.
    public function sender(): BelongsTo
    {
        return $this->belongsTo(User::class, 'sender_id');
    }
}
