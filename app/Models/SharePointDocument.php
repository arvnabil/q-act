<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SharePointDocument extends Model
{
    protected $table = 'sharepoint_documents';

    protected $fillable = [
        'source_type',
        'source_id',
        'purchase_order_id',
        'quotation_id',
        'document_type',
        'original_filename',
        'file_size',
        'mime_type',
        'sharepoint_item_id',
        'sharepoint_web_url',
        'sharepoint_folder_path',
        'status',
        'error_message',
        'retry_count',
        'uploaded_by',
        'synced_at',
    ];

    protected $casts = [
        'file_size'   => 'integer',
        'retry_count' => 'integer',
        'synced_at'   => 'datetime',
    ];

    public function uploader(): BelongsTo
    {
        return $this->belongsTo(User::class, 'uploaded_by');
    }

    public function quotation(): BelongsTo
    {
        return $this->belongsTo(Quotation::class, 'quotation_id');
    }

    public function purchaseOrder(): BelongsTo
    {
        return $this->belongsTo(QuotationPurchaseOrder::class, 'purchase_order_id');
    }
}
