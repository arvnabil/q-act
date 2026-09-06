<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Brand extends Model
{
    protected $fillable = ['id', 'name', 'color_hex'];

    public $incrementing = false;
    protected $keyType = 'string';

    public function products(): HasMany
    {
        return $this->hasMany(Product::class);
    }
}
