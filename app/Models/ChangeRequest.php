<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ChangeRequest extends Model
{
    use HasUuids;

    protected $fillable = [
        'type', 'status', 'quotation_id', 'sales_order_id', 'requested_by',
        'approved_by', 'resulting_quotation_id', 'reason', 'manager_comment',
    ];

    public function quotation(): BelongsTo { return $this->belongsTo(Quotation::class); }
    public function salesOrder(): BelongsTo { return $this->belongsTo(SalesOrder::class); }
    public function requester(): BelongsTo { return $this->belongsTo(User::class, 'requested_by'); }
    public function approver(): BelongsTo { return $this->belongsTo(User::class, 'approved_by'); }
    public function resultingQuotation(): BelongsTo { return $this->belongsTo(Quotation::class, 'resulting_quotation_id'); }
}
