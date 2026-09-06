<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Illuminate\Support\Str;
use Spatie\Permission\Traits\HasRoles;

class User extends Authenticatable
{
    use HasFactory, Notifiable, HasRoles;

    protected $keyType = 'string';
    public $incrementing = false;

    protected $fillable = [
        'id',
        'sales_code',
        'name',
        'email',
        'password',
        'role',
        'mobile',
        'avatar_initials',
        'avatar_url',
        'signature_url',
        'target_sales',
        'achieved_sales',
        'is_active',
    ];

    protected $hidden = [
        'password',
        'remember_token',
    ];

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'is_active' => 'boolean',
            'target_sales' => 'integer',
            'achieved_sales' => 'integer',
        ];
    }

    protected static function boot(): void
    {
        parent::boot();
        static::creating(function ($model) {
            if (empty($model->id)) {
                $model->id = (string) Str::uuid();
            }
        });
    }

    // Relationships
    public function businessUnitMember(): HasOne
    {
        return $this->hasOne(BusinessUnitMember::class);
    }

    public function businessUnit()
    {
        return $this->hasOneThrough(
            BusinessUnit::class,
            BusinessUnitMember::class,
            'user_id',
            'id',
            'id',
            'business_unit_id'
        );
    }

    public function quotations(): HasMany
    {
        return $this->hasMany(Quotation::class, 'sales_id');
    }

    public function salesOrders(): HasMany
    {
        return $this->hasMany(SalesOrder::class, 'sales_id');
    }

    public function activityLogs(): HasMany
    {
        return $this->hasMany(ActivityLog::class);
    }

    // Helpers
    public function isAdmin(): bool
    {
        return $this->hasRole(['Administrator', 'admin']);
    }

    public function isManager(): bool
    {
        return $this->hasRole(['Manager', 'Sales Manager']);
    }

    public function isSales(): bool
    {
        return $this->hasRole(['Sales', 'Presales']);
    }

    public function sendPasswordResetNotification($token): void
    {
        $this->notify(new \App\Notifications\ResetPasswordNotification($token));
    }
}
