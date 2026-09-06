<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SalesOrderCost extends Model
{
    use HasUuids;

    protected $guarded = [];

    public function category(): BelongsTo
    {
        return $this->belongsTo(CostCategory::class, 'cost_category_id');
    }
}
