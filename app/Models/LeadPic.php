<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class LeadPic extends Model
{
    use HasUuids;

    protected $fillable = [
        'lead_id',
        'customer_pic_id',
        'name',
        'phone',
        'email',
        'position',
        'role',
        'is_primary',
        'created_by',
    ];

    protected $casts = [
        'is_primary' => 'boolean',
    ];

    public function lead(): BelongsTo
    {
        return $this->belongsTo(Lead::class);
    }

    public function customerPic(): BelongsTo
    {
        return $this->belongsTo(CustomerPic::class, 'customer_pic_id');
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
