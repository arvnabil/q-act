<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('quotation_purchase_orders', function (Blueprint $table) {
            $table->longText('email_note')->nullable()->after('document_path');
        });
    }

    public function down(): void
    {
        Schema::table('quotation_purchase_orders', function (Blueprint $table) {
            $table->dropColumn('email_note');
        });
    }
};
