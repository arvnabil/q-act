<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('quotation_items', function (Blueprint $table) {
            // Add product_id (UUID FK to products.sku) — nullable for custom items
            $table->string('product_id', 50)->nullable()->after('quotation_id');
            // Add display fields — used when product is custom or when product data is snapshotted
            $table->string('name')->nullable()->after('product_id');
            $table->string('brand')->nullable()->after('name');
            $table->text('description')->nullable()->after('brand');
            $table->text('image_url')->nullable()->after('description');

            // Add branch column to company_bank_accounts if missing
        });

        // Add branch column to company_bank_accounts
        if (!Schema::hasColumn('company_bank_accounts', 'branch')) {
            Schema::table('company_bank_accounts', function (Blueprint $table) {
                $table->string('branch')->nullable()->after('account_name');
            });
        }
    }

    public function down(): void
    {
        Schema::table('quotation_items', function (Blueprint $table) {
            $table->dropColumn(['product_id', 'name', 'brand', 'description', 'image_url']);
        });
    }
};
