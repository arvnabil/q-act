<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class QuotationPurchaseOrder extends Model
{
    protected $table = 'quotation_purchase_orders';

    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'id', 'quotation_id', 'status', 'po_number', 'po_date', 'document_path',
        'quotation_item_ids', 'created_by',
    ];

    protected $casts = [
        'po_date' => 'date',
        'quotation_item_ids' => 'array',
    ];

    public function quotation(): BelongsTo
    {
        return $this->belongsTo(Quotation::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
