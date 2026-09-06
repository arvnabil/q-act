<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasManyThrough;
use Illuminate\Support\Str;

class BusinessUnit extends Model
{
    protected $keyType = 'string';
    public $incrementing = false;

    protected $fillable = ['id', 'name', 'code', 'color', 'description', 'is_active'];

    protected $casts = ['is_active' => 'boolean'];

    protected static function boot(): void
    {
        parent::boot();
        static::creating(fn($m) => $m->id ??= (string) Str::uuid());
    }

    public function members(): HasMany
    {
        return $this->hasMany(BusinessUnitMember::class);
    }

    public function users(): HasManyThrough
    {
        return $this->hasManyThrough(User::class, BusinessUnitMember::class, 'business_unit_id', 'id', 'id', 'user_id');
    }

    public function customers(): HasMany
    {
        return $this->hasMany(Customer::class, 'bu_id');
    }

    public function quotations(): HasMany
    {
        return $this->hasMany(Quotation::class, 'bu_id');
    }
}
