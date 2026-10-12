<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class BusinessUnitMember extends Model
{
    use HasUuids;

    public $timestamps = false;

    protected $fillable = ['id', 'business_unit_id', 'user_id', 'role_in_bu', 'joined_at'];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
