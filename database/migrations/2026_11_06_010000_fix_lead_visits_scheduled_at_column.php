<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        // 1. Modify scheduled_at to DATETIME NOT NULL to remove automatic "ON UPDATE CURRENT_TIMESTAMP"
        // In MySQL / MariaDB, timestamp without nullable/default gets 'DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'
        $driver = Schema::getConnection()->getDriverName();
        if ($driver === 'mysql') {
            DB::statement('ALTER TABLE `lead_visits` MODIFY `scheduled_at` DATETIME NOT NULL');
            DB::statement('ALTER TABLE `lead_visits` MODIFY `end_at` DATETIME NULL DEFAULT NULL');
        }

        // 2. Fix the corrupted date for the "Unlink Zoom Yayasan Purnomo Sewa" visit
        // Its original Google Calendar date was 2026-10-29 to 2026-10-30
        DB::table('lead_visits')
            ->where('id', '01a1ae41-03c5-7321-ace3-a58af166ab5c')
            ->update([
                'scheduled_at' => '2026-10-28 17:00:00', // 2026-10-29 00:00:00 WIB
                'end_at'       => '2026-10-30 16:59:59', // 2026-10-30 23:59:59 WIB
            ]);

        // 3. Fallback: Any other visit where scheduled_at > end_at due to the same bug
        DB::table('lead_visits')
            ->whereNotNull('end_at')
            ->whereRaw('scheduled_at > end_at')
            ->update([
                'scheduled_at' => DB::raw('end_at'),
            ]);
    }

    public function down(): void
    {
        $driver = Schema::getConnection()->getDriverName();
        if ($driver === 'mysql') {
            DB::statement('ALTER TABLE `lead_visits` MODIFY `scheduled_at` TIMESTAMP NOT NULL');
            DB::statement('ALTER TABLE `lead_visits` MODIFY `end_at` TIMESTAMP NULL DEFAULT NULL');
        }
    }
};

