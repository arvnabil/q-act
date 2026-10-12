<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('quotations', function (Blueprint $table) {
            $table->string('po_status')->nullable()->after('status');
            $table->string('po_number')->nullable()->after('po_status');
            $table->date('po_date')->nullable()->after('po_number');
            $table->string('po_document_path')->nullable()->after('po_date');
        });

        Schema::table('sales_orders', function (Blueprint $table) {
            $table->string('po_status')->nullable()->after('status');
            $table->string('po_document_path')->nullable()->after('po_status');
        });
    }

    public function down(): void
    {
        Schema::table('sales_orders', function (Blueprint $table) {
            $table->dropColumn(['po_status', 'po_document_path']);
        });
        Schema::table('quotations', function (Blueprint $table) {
            $table->dropColumn(['po_status', 'po_number', 'po_date', 'po_document_path']);
        });
    }
};
