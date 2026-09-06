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
        // Update products table image_url from https://qsales.activ.co.id/images/ to /storage/images/products/
        DB::table('products')
            ->where('image_url', 'LIKE', '%qsales.activ.co.id/images/%')
            ->update([
                'image_url' => DB::raw("REPLACE(image_url, 'https://qsales.activ.co.id/images/', '/storage/images/products/')")
            ]);

        DB::table('products')
            ->where('image_url', 'LIKE', '%http://qsales.activ.co.id/images/%')
            ->update([
                'image_url' => DB::raw("REPLACE(image_url, 'http://qsales.activ.co.id/images/', '/storage/images/products/')")
            ]);

        // Update quotation_items table image_url
        DB::table('quotation_items')
            ->where('image_url', 'LIKE', '%qsales.activ.co.id/images/%')
            ->update([
                'image_url' => DB::raw("REPLACE(image_url, 'https://qsales.activ.co.id/images/', '/storage/images/products/')")
            ]);

        DB::table('quotation_items')
            ->where('image_url', 'LIKE', '%http://qsales.activ.co.id/images/%')
            ->update([
                'image_url' => DB::raw("REPLACE(image_url, 'http://qsales.activ.co.id/images/', '/storage/images/products/')")
            ]);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        DB::table('products')
            ->where('image_url', 'LIKE', '%/storage/images/products/%')
            ->update([
                'image_url' => DB::raw("REPLACE(image_url, '/storage/images/products/', 'https://qsales.activ.co.id/images/')")
            ]);

        DB::table('quotation_items')
            ->where('image_url', 'LIKE', '%/storage/images/products/%')
            ->update([
                'image_url' => DB::raw("REPLACE(image_url, '/storage/images/products/', 'https://qsales.activ.co.id/images/')")
            ]);
    }
};
