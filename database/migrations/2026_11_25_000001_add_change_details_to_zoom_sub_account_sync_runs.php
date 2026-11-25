<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('zoom_sub_account_sync_runs', function (Blueprint $table) {
            $table->json('change_details')->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('zoom_sub_account_sync_runs', function (Blueprint $table) {
            $table->dropColumn('change_details');
        });
    }
};
