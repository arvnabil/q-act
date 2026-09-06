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
        // 1. Populate item_name from products table where matching SKU exists
        DB::statement("
            UPDATE sales_order_items soi
            JOIN products p ON soi.sku = p.sku
            SET soi.item_name = p.name
            WHERE soi.item_name IS NULL OR soi.item_name = ''
        ");

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
