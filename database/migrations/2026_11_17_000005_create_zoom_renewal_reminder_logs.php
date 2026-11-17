<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('zoom_renewal_reminder_logs', function (Blueprint $table) {
            $table->id();
            $table->string('zoom_account_id', 80);
            $table->date('renewal_date');
            $table->unsignedSmallInteger('days_before');
            $table->timestamp('sent_at');
            $table->timestamps();
            $table->unique(['zoom_account_id', 'renewal_date', 'days_before'], 'zoom_renewal_reminder_once');
            $table->foreign('zoom_account_id')->references('zoom_account_id')->on('zoom_sub_accounts')->cascadeOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('zoom_renewal_reminder_logs');
    }
};
