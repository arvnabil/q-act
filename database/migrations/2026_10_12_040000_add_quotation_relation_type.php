<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('quotations', function (Blueprint $table) {
            $table->string('relation_type', 20)->default('main')->after('revision_no');
            $table->index(['parent_quotation_id', 'relation_type']);
        });
    }

    public function down(): void
    {
        Schema::table('quotations', function (Blueprint $table) {
            $table->dropIndex(['parent_quotation_id', 'relation_type']);
            $table->dropColumn('relation_type');
        });
    }
};
