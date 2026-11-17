<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ZoomSubAccount extends Model
{
    protected $fillable = [
        'zoom_account_id',
        'account_name',
        'account_number',
        'account_type',
        'owner_email',
        'seats',
        'bulk_license',
        'is_sub_reseller',
        'zoom_created_at',
        'subscription_start_time',
        'subscription_end_time',
        'is_present',
        'last_seen_at',
        'last_sync_run_id',
        'customer_id',
        'matched_by',
        'matched_at',
    ];

    protected function casts(): array
    {
        return [
            'seats' => 'integer',
            'bulk_license' => 'boolean',
            'is_sub_reseller' => 'boolean',
            'is_present' => 'boolean',
            'zoom_created_at' => 'datetime',
            'subscription_start_time' => 'datetime',
            'subscription_end_time' => 'datetime',
            'last_seen_at' => 'datetime',
            'matched_at' => 'datetime',
        ];
    }

    public function customer(): BelongsTo
    {
        return $this->belongsTo(Customer::class);
    }

    public function matcher(): BelongsTo
    {
        return $this->belongsTo(User::class, 'matched_by');
    }
}
