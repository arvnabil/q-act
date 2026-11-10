<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('po_notification_logs', function (Blueprint $table) {
            $table->id();
            $table->string('purchase_order_id', 64);
            $table->string('quotation_id', 64);
            $table->json('recipients');
            $table->string('subject');
            $table->string('status', 32)->default('sent'); // 'sent', 'failed'
            $table->text('error_message')->nullable();
            $table->timestamp('sent_at')->nullable();
            $table->timestamps();

            $table->index('purchase_order_id');
            $table->index('quotation_id');
            $table->index('status');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('po_notification_logs');
    }
};
