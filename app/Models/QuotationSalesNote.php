<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Concerns\HasUuids;

class QuotationSalesNote extends Model
{
    use HasUuids;

    protected $guarded = [];

    protected $casts = [
        'adjustments' => 'array',
    ];

    public function quotation()
    {
        return $this->belongsTo(Quotation::class);
    }
}
