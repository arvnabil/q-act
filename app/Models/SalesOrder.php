<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class SalesOrder extends Model
{
    protected $keyType = 'string';

    public $incrementing = false;

    protected $fillable = [
        'id', 'quotation_id', 'customer_id', 'sales_id', 'bu_id',
        'parent_sales_order_id',
        'date', 'po_number', 'po_date', 'po_status', 'po_document_path', 'status',
        'total_item_value', 'total_cost', 'grand_total',
    ];

    protected $casts = [
        'date' => 'date',
        'po_date' => 'date',
        'total_item_value' => 'float',
        'total_cost' => 'float',
        'grand_total' => 'float',
    ];

    public function quotation(): BelongsTo
    {
        return $this->belongsTo(Quotation::class);
    }

    public function customer(): BelongsTo
    {
        return $this->belongsTo(Customer::class);
    }

    public function sales(): BelongsTo
    {
        return $this->belongsTo(User::class, 'sales_id');
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'sales_id');
    }

    public function businessUnit(): BelongsTo
    {
        return $this->belongsTo(BusinessUnit::class, 'bu_id');
    }

    public function items(): HasMany
    {
        return $this->hasMany(SalesOrderItem::class, 'so_id')
            ->orderBy('sort_order')
            ->orderBy('created_at')
            ->orderBy('id');
    }

    public function costs(): HasMany
    {
        return $this->hasMany(SalesOrderCost::class, 'so_id');
    }

    public function parentSalesOrder(): BelongsTo { return $this->belongsTo(self::class, 'parent_sales_order_id'); }
    public function revisedSalesOrders(): HasMany { return $this->hasMany(self::class, 'parent_sales_order_id'); }
}
