<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Product extends Model
{
    protected $primaryKey = 'sku';
    protected $keyType = 'string';
    public $incrementing = false;

    protected $fillable = [
        'sku', 'brand_id', 'name', 'description', 'price',
        'pricelist_distributor', 'diskon_distributor', 'modal',
        'margin_sales', 'image_url', 'is_active',
    ];

    protected $casts = [
        'price' => 'integer',
        'pricelist_distributor' => 'integer',
        'diskon_distributor' => 'float',
        'modal' => 'integer',
        'margin_sales' => 'float',
        'is_active' => 'boolean',
    ];

    public function brand(): BelongsTo
    {
        return $this->belongsTo(Brand::class);
    }

    public function quotationItems(): HasMany
    {
        return $this->hasMany(QuotationItem::class, 'sku', 'sku');
    }
}
