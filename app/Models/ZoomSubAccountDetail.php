<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ZoomSubAccountDetail extends Model
{
    protected $fillable = [
        'zoom_account_id',
        'detail_type',
        'payload',
        'fetched_at',
    ];

    protected function casts(): array
    {
        return [
            'payload' => 'encrypted:array',
            'fetched_at' => 'datetime',
        ];
    }
}
