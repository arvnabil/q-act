<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ZoomSubAccountSyncRun extends Model
{
    protected $fillable = [
        'triggered_by',
        'status',
        'accounts_seen',
        'accounts_added',
        'accounts_updated',
        'accounts_unchanged',
        'pages_fetched',
        'error_message',
        'started_at',
        'finished_at',
    ];

    protected function casts(): array
    {
        return [
            'accounts_seen' => 'integer',
            'accounts_added' => 'integer',
            'accounts_updated' => 'integer',
            'accounts_unchanged' => 'integer',
            'pages_fetched' => 'integer',
            'started_at' => 'datetime',
            'finished_at' => 'datetime',
        ];
    }

    public function triggeredBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'triggered_by');
    }
}
