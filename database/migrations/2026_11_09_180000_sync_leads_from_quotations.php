<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\Artisan;

return new class extends Migration
{
    public function up(): void
    {
        // Jalankan perintah sinkronisasi otomatis untuk lead yang sudah terlanjur dibuat
        Artisan::call('leads:sync-quotations');
    }

    public function down(): void
    {
        // No-op
    }
};
