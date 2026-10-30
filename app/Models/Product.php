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
        'sku', 'slug', 'brand_id', 'name', 'description', 'price',
        'pricelist_distributor', 'diskon_distributor', 'modal',
        'margin_sales', 'image_url', 'is_active',
    ];

    /**
     * Use slug as the route key for implicit route model binding
     */
    public function getRouteKeyName(): string
    {
        return 'slug';
    }

    /**
     * Resolve route binding by slug first, with fallback to sku
     */
    public function resolveRouteBinding($value, $field = null)
    {
        return $this->where('slug', $value)
            ->orWhere('sku', $value)
            ->firstOrFail();
    }

    protected static function booted()
    {
        static::saving(function ($product) {
            if (empty($product->slug) || ($product->isDirty('name') && empty($product->slug))) {
                $baseSlug = \Illuminate\Support\Str::slug($product->name);
                if (empty($baseSlug)) {
                    $cleanSku = preg_replace('/[\r\n]+/', ' ', (string) $product->sku);
                    $baseSlug = \Illuminate\Support\Str::slug($cleanSku) ?: ('prod-' . \Illuminate\Support\Str::lower(\Illuminate\Support\Str::random(8)));
                }

                $slug = $baseSlug;
                $counter = 1;
                while (static::where('slug', $slug)->where('sku', '!=', $product->sku)->exists()) {
                    $slug = "{$baseSlug}-" . (++$counter);
                }
                $product->slug = $slug;
            }
        });
    }

    protected $casts = [
        'price' => 'float',
        'pricelist_distributor' => 'float',
        'diskon_distributor' => 'float',
        'modal' => 'float',
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
