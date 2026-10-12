<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class QuotationItem extends Model
{
    public $timestamps = false;

    protected $fillable = [
        'quotation_id', 'source_quotation_item_id', 'product_id', 'sku', 'name', 'brand', 'description', 'image_url',
        'qty', 'hpp', 'price', 'margin', 'is_pph_applied', 'sort_order',
    ];

    protected $casts = [
        'qty'            => 'integer',
        'hpp'            => 'float',
        'price'          => 'float',
        'margin'         => 'float',
        'is_pph_applied' => 'boolean',
        'sort_order'     => 'integer',
    ];

    public function quotation(): BelongsTo
    {
        return $this->belongsTo(Quotation::class);
    }

    public function product(): BelongsTo
    {
        // product_id stores the SKU string (Product PK is 'sku')
        return $this->belongsTo(Product::class, 'sku', 'sku');
    }

    public function getSubtotalAttribute(): float
    {
        return ($this->qty ?? 0) * ($this->price ?? 0);
    }
}
