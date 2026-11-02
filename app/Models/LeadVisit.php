<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class LeadVisit extends Model
{
    use HasUuids;

    protected $fillable = [
        'lead_id',
        'user_id',
        'customer_id',
        'visit_type',
        'subject',
        'location',
        'scheduled_at',
        'checked_in_at',
        'checked_in_lat',
        'checked_in_lng',
        'notes',
        'outcome',
    ];

    protected $casts = [
        'scheduled_at'   => 'datetime',
        'checked_in_at'  => 'datetime',
        'checked_in_lat' => 'float',
        'checked_in_lng' => 'float',
    ];

    public function lead(): BelongsTo
    {
        return $this->belongsTo(Lead::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function customer(): BelongsTo
    {
        return $this->belongsTo(Customer::class);
    }
}

