<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class LeadActivity extends Model
{
    use HasUuids;

    public const TYPES = [
        'note',
        'call',
        'email',
        'whatsapp',
        'meeting',
        'visit',
        'follow_up',
        'stage_change',
        'quotation_linked',
        'deal_won',
        'deal_lost',
    ];

    protected $fillable = [
        'lead_id',
        'user_id',
        'type',
        'title',
        'description',
        'scheduled_at',
        'completed_at',
        'metadata',
    ];

    protected $casts = [
        'metadata'     => 'array',
        'scheduled_at' => 'datetime',
        'completed_at' => 'datetime',
    ];

    public function visit() { return $this->hasOne(LeadVisit::class, 'lead_activity_id'); }

    public function lead(): BelongsTo
    {
        return $this->belongsTo(Lead::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}

