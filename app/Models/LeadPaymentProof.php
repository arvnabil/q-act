<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasOne;

class LeadPaymentProof extends Model
{
    use HasUuids;

    protected $fillable = [
        'lead_id', 'uploaded_by', 'quotation_id', 'purchase_order_id', 'sales_order_id',
        'source_label', 'path', 'original_name', 'mime_type', 'size',
    ];

    public function lead(): BelongsTo
    {
        return $this->belongsTo(Lead::class);
    }

    public function uploader(): BelongsTo
    {
        return $this->belongsTo(User::class, 'uploaded_by');
    }

    public function quotation(): BelongsTo
    {
        return $this->belongsTo(Quotation::class);
    }

    public function purchaseOrder(): BelongsTo
    {
        return $this->belongsTo(QuotationPurchaseOrder::class, 'purchase_order_id');
    }

    public function salesOrder(): BelongsTo
    {
        return $this->belongsTo(SalesOrder::class, 'sales_order_id');
    }

    public function sharePointDocument(): HasOne
    {
        return $this->hasOne(SharePointDocument::class, 'source_id', 'id')
            ->where('source_type', 'lead_payment_proof')
            ->where('document_type', 'payment_proof');
    }
}
