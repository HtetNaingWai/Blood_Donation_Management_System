<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class RequestResponse extends Model
{
    protected $table = 'request_responses';

    protected $guarded = [];

    protected function casts(): array
    {
        return [
            'completed_at' => 'datetime',
        ];
    }
}
