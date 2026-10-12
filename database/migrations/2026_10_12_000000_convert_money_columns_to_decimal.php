<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->decimal('price', 18, 2)->default(0)->change();
            $table->decimal('pricelist_distributor', 18, 2)->default(0)->change();
            $table->decimal('modal', 18, 2)->default(0)->change();
        });

        Schema::table('quotation_items', function (Blueprint $table) {
            $table->decimal('hpp', 18, 2)->default(0)->change();
            $table->decimal('price', 18, 2)->default(0)->change();
        });
    }

    public function down(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->bigInteger('price')->default(0)->change();
            $table->bigInteger('pricelist_distributor')->default(0)->change();
            $table->bigInteger('modal')->default(0)->change();
        });

        Schema::table('quotation_items', function (Blueprint $table) {
            $table->bigInteger('hpp')->default(0)->change();
            $table->bigInteger('price')->default(0)->change();
        });
    }
};
