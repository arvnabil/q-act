<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('lead_visits', function (Blueprint $table) {
            if (!Schema::hasColumn('lead_visits', 'end_at')) {
                $table->timestamp('end_at')->nullable()->after('scheduled_at');
            }
            if (!Schema::hasColumn('lead_visits', 'is_all_day')) {
                $table->boolean('is_all_day')->default(false)->after('end_at');
            }
        });
    }

    public function down(): void
    {
        Schema::table('lead_visits', function (Blueprint $table) {
            $table->dropColumn(['end_at', 'is_all_day']);
        });
    }
};

