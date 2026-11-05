<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class LeadVisit extends Model
{
    use HasUuids;

    protected $fillable = [
        'quotation_id', 'lead_activity_id', 'cancelled_at',
        'lead_id',
        'user_id',
        'customer_id',
        'visit_type',
        'subject',
        'location',
        'scheduled_at',
        'end_at',
        'is_all_day',
        'checked_in_at',
        'checked_in_lat',
        'checked_in_lng',
        'notes',
        'outcome',
        'gc_event_id',
        'zoom_meeting_id',
        'zoom_join_url',
        'zoom_recording_url',
    ];

    protected $casts = [
        'cancelled_at' => 'datetime',
        'scheduled_at'   => 'datetime',
        'end_at'         => 'datetime',
        'is_all_day'     => 'boolean',
        'checked_in_at'  => 'datetime',
        'checked_in_lat' => 'float',
        'checked_in_lng' => 'float',
    ];

    public function quotation(): BelongsTo { return $this->belongsTo(Quotation::class); }

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

