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
        'sync_google_calendar',
        'google_sync_status',
        'google_sync_error',
        'google_synced_at',
        'sync_outlook_calendar',
        'outlook_event_id',
        'outlook_sync_status',
        'outlook_sync_error',
        'outlook_synced_at',
        'attendee_emails',
        'include_lead_info',
        'zoom_meeting_id',
        'zoom_join_url',
        'zoom_recording_url',
    ];

    protected $casts = [
        'cancelled_at' => 'datetime',
        'scheduled_at'   => 'datetime',
        'end_at'         => 'datetime',
        'is_all_day'     => 'boolean',
        'sync_google_calendar' => 'boolean',
        'sync_outlook_calendar' => 'boolean',
        'include_lead_info' => 'boolean',
        'attendee_emails' => 'array',
        'google_synced_at' => 'datetime',
        'outlook_synced_at' => 'datetime',
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

