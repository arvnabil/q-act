<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Lead extends Model
{
    use HasUuids;

    public const STAGES = [
        'lead_masuk',
        'follow_up',
        'lead_qualification',
        'negotiation',
        'win',
        'lost',
        'selesai_terbayar',
    ];

    public const SOURCES = [
        'referral',
        'cold_call',
        'website',
        'exhibition',
        'generate_ai',
        'other',
    ];

    protected $fillable = [
        'lead_code',
        'title',
        'customer_id',
        'customer_name',
        'customer_phone',
        'customer_email',
        'customer_address',
        'pic_name',
        'pic_phone',
        'sales_id',
        'bu_id',
        'stage',
        'source',
        'estimated_value',
        'quotation_id',
        'notes',
        'lost_reason',
        'tags',
        'sort_order',
        'is_archived',
        'created_by',
        'updated_by',
        'converted_at',
    ];

    protected $casts = [
        'estimated_value' => 'float',
        'tags'            => 'array',
        'is_archived'     => 'boolean',
        'converted_at'    => 'datetime',
        'sort_order'      => 'integer',
    ];

    // ─── Relations ──────────────────────────────────────────────────────────────

    public function customer(): BelongsTo
    {
        return $this->belongsTo(Customer::class);
    }

    public function sales(): BelongsTo
    {
        return $this->belongsTo(User::class, 'sales_id');
    }

    public function businessUnit(): BelongsTo
    {
        return $this->belongsTo(BusinessUnit::class, 'bu_id');
    }

    public function quotation(): BelongsTo
    {
        return $this->belongsTo(Quotation::class);
    }

    public function quotations(): HasMany
    {
        return $this->hasMany(Quotation::class, 'lead_id')->latest();
    }

    public function pics(): HasMany
    {
        return $this->hasMany(LeadPic::class, 'lead_id');
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function updater(): BelongsTo
    {
        return $this->belongsTo(User::class, 'updated_by');
    }

    public function activities(): HasMany
    {
        return $this->hasMany(LeadActivity::class)->latest();
    }

    public function visits(): HasMany
    {
        return $this->hasMany(LeadVisit::class)->orderBy('scheduled_at');
    }

    // ─── Scopes ─────────────────────────────────────────────────────────────────

    public function scopeActive($query)
    {
        return $query->where('is_archived', false);
    }

    public function scopeForUser($query, string $userId)
    {
        return $query->where(function ($q) use ($userId) {
            $q->where('sales_id', $userId)->orWhere('created_by', $userId);
        });
    }
}

