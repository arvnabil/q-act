<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // 1. Populate item_name from products table where matching SKU exists.
        //    MySQL/MariaDB use a single UPDATE...JOIN; other drivers (e.g. the
        //    SQLite test database) do not support that syntax, so backfill there
        //    row-by-row with identical semantics.
        if (in_array(DB::connection()->getDriverName(), ['mysql', 'mariadb'], true)) {
            DB::statement("
                UPDATE sales_order_items soi
                JOIN products p ON soi.sku = p.sku
                SET soi.item_name = p.name
                WHERE soi.item_name IS NULL OR soi.item_name = ''
            ");
        } else {
            $rows = DB::table('sales_order_items as soi')
                ->join('products as p', 'soi.sku', '=', 'p.sku')
                ->whereNull('soi.item_name')
                ->orWhere('soi.item_name', '')
                ->select('soi.id', 'p.name')
                ->get();

            foreach ($rows as $row) {
                DB::table('sales_order_items')->where('id', $row->id)->update(['item_name' => $row->name]);
            }
        }

        // 2. Fallback: If still NULL, set item_name to sku
        DB::statement("
            UPDATE sales_order_items
            SET item_name = sku
            WHERE item_name IS NULL OR item_name = ''
        ");
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        //
    }
};
