<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('quotation_purchase_orders', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('quotation_id', 30);
            $table->string('status', 30);
            $table->string('po_number', 100);
            $table->date('po_date');
            $table->string('document_path')->nullable();
            $table->json('quotation_item_ids')->nullable();
            $table->foreignUuid('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->foreign('quotation_id')->references('id')->on('quotations')->cascadeOnDelete();
            $table->unique(['quotation_id', 'po_number']);
            $table->index(['quotation_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('quotation_purchase_orders');
    }
};
