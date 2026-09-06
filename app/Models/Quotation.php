<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Quotation extends Model
{
    protected $keyType = 'string';
    public $incrementing = false;

    protected $fillable = [
        'id', 'customer_id', 'pic_id', 'sales_id', 'bu_id', 'bank_account_id',
        'status', 'date', 'expired', 'calc_tax', 'show_tax', 'ppn_rate',
        'calc_pph', 'show_pph', 'pph_rate', 'notes', 'terms',
        'subtotal', 'tax_amount', 'grand_total',
        'is_deleted', 'deleted_at', 'created_by', 'updated_by',
    ];

    protected $casts = [
        'date' => 'date',
        'expired' => 'date',
        'deleted_at' => 'datetime',
        'calc_tax' => 'boolean',
        'show_tax' => 'boolean',
        'calc_pph' => 'boolean',
        'show_pph' => 'boolean',
        'is_deleted' => 'boolean',
        'ppn_rate' => 'float',
        'pph_rate' => 'float',
        'terms' => 'array',
    ];

    // Scope: only non-deleted
    public function scopeActive($query)
    {
        return $query->where('is_deleted', false);
    }

    public function scopeTrashed($query)
    {
        return $query->where('is_deleted', true);
    }

    public function customer(): BelongsTo
    {
        return $this->belongsTo(Customer::class);
    }

    public function pic(): BelongsTo
    {
        return $this->belongsTo(CustomerPic::class, 'pic_id');
    }

    public function sales(): BelongsTo
    {
        return $this->belongsTo(User::class, 'sales_id');
    }

    public function businessUnit(): BelongsTo
    {
        return $this->belongsTo(BusinessUnit::class, 'bu_id');
    }

    public function bankAccount(): BelongsTo
    {
        return $this->belongsTo(CompanyBankAccount::class, 'bank_account_id');
    }

    public function items(): HasMany
    {
        return $this->hasMany(QuotationItem::class)->orderBy('sort_order');
    }

    public function salesNotes(): HasMany
    {
        return $this->hasMany(QuotationSalesNote::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function updater(): BelongsTo
    {
        return $this->belongsTo(User::class, 'updated_by');
    }

    public function getSubtotalAttribute($value)
    {
        if ($value !== null && (float) $value > 0) {
            return (float) $value;
        }
        if ($this->relationLoaded('items')) {
            return (float) $this->items->sum(fn($i) => ($i->qty ?? 0) * ($i->price ?? 0));
        }
        return (float) ($value ?? 0);
    }

    public function getGrandTotalAttribute($value)
    {
        if ($value !== null && (float) $value > 0) {
            return (float) $value;
        }
        $sub = $this->subtotal;
        $ppn = ($this->calc_tax !== false && $this->show_tax !== false) ? round($sub * ($this->ppn_rate ?? 0.11)) : 0;
        $pph = ($this->calc_pph && $this->show_pph) ? round($sub * ($this->pph_rate ?? 0.02)) : 0;
        return (float) ($sub + $ppn + $pph);
    }
}
