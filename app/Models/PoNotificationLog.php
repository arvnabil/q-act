<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PoNotificationLog extends Model
{
    protected $table = 'po_notification_logs';

    protected $fillable = [
        'purchase_order_id',
        'quotation_id',
        'recipients',
        'subject',
        'status',
        'error_message',
        'sent_at',
    ];

    protected $casts = [
        'recipients' => 'json',
        'sent_at'    => 'datetime',
    ];
}
