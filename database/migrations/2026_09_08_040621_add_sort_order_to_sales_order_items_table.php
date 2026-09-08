<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('sales_order_items', function (Blueprint $table) {
            $table->unsignedInteger('sort_order')->default(0)->after('hpp');
        });

        // Backfill a deterministic order for existing rows: per SO, ordered by
        // creation time, using the PK as a stable tie-breaker.
        $soIds = DB::table('sales_order_items')->distinct()->pluck('so_id');

        foreach ($soIds as $soId) {
            $items = DB::table('sales_order_items')
                ->where('so_id', $soId)
                ->orderBy('created_at')
                ->orderBy('id')
                ->get();

            foreach ($items as $index => $item) {
                DB::table('sales_order_items')
                    ->where('id', $item->id)
                    ->update(['sort_order' => $index]);
            }
        }
    }

    public function down(): void
    {
        Schema::table('sales_order_items', function (Blueprint $table) {
            $table->dropColumn('sort_order');
        });
    }
};
