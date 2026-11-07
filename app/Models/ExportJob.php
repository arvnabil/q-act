<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ExportJob extends Model
{
    use HasUuids;

    protected $fillable = [
        'user_id',
        'type',
        'title',
        'status',
        'progress',
        'total_items',
        'processed_items',
        'file_path',
        'file_name',
        'file_size',
        'error_message',
        'completed_at',
        'expires_at',
    ];

    protected $casts = [
        'progress' => 'integer',
        'total_items' => 'integer',
        'processed_items' => 'integer',
        'file_size' => 'integer',
        'completed_at' => 'datetime',
        'expires_at' => 'datetime',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Format file size to human readable (KB, MB, etc.)
     */
    public function getFormattedFileSizeAttribute(): string
    {
        if (!$this->file_size) return '0 B';
        $bytes = $this->file_size;
        $units = ['B', 'KB', 'MB', 'GB'];
        $i = 0;
        while ($bytes >= 1024 && $i < count($units) - 1) {
            $bytes /= 1024;
            $i++;
        }
        return round($bytes, 2) . ' ' . $units[$i];
    }
}
