<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class UserTermsTemplate extends Model
{
    use HasUuids;

    protected $table = 'user_terms_templates';
    protected $fillable = ['user_id', 'name', 'terms'];
    protected $casts = ['terms' => 'array'];

    public function user(): BelongsTo { return $this->belongsTo(User::class); }
}
