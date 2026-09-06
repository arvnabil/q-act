<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SystemSetting extends Model
{
    protected $guarded = [];
    protected $primaryKey = 'key';
    protected $keyType = 'string';
    public $incrementing = false;

    protected $casts = [
        'value' => 'json',
    ];
}
