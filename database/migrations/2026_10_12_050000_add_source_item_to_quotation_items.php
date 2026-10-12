<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('quotation_items', function (Blueprint $table) {
            $table->unsignedBigInteger('source_quotation_item_id')->nullable()->after('quotation_id');
            $table->foreign('source_quotation_item_id')
                ->references('id')
                ->on('quotation_items')
                ->nullOnDelete();
            $table->index('source_quotation_item_id');
        });
    }

    public function down(): void
    {
        Schema::table('quotation_items', function (Blueprint $table) {
            $table->dropForeign(['source_quotation_item_id']);
            $table->dropIndex(['source_quotation_item_id']);
            $table->dropColumn('source_quotation_item_id');
        });
    }
};
