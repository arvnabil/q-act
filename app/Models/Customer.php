<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Customer extends Model
{
    protected $keyType = 'string';
    public $incrementing = false;

    protected $fillable = ['id', 'name', 'address', 'total_spend', 'bu_id', 'created_by'];

    protected $casts = ['total_spend' => 'integer'];

    public function businessUnit(): BelongsTo
    {
        return $this->belongsTo(BusinessUnit::class, 'bu_id');
    }

    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function pics(): HasMany
    {
        return $this->hasMany(CustomerPic::class);
    }

    public function quotations(): HasMany
    {
        return $this->hasMany(Quotation::class);
    }

    public function salesOrders(): HasMany
    {
        return $this->hasMany(SalesOrder::class);
    }
}
