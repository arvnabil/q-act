<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('lead_payment_proofs', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('lead_id');
            $table->foreign('lead_id')->references('id')->on('leads')->cascadeOnDelete();
            $table->uuid('uploaded_by')->nullable();
            $table->foreign('uploaded_by')->references('id')->on('users')->nullOnDelete();
            $table->string('quotation_id', 30)->nullable();
            $table->foreign('quotation_id')->references('id')->on('quotations')->nullOnDelete();
            $table->uuid('purchase_order_id')->nullable();
            $table->foreign('purchase_order_id')->references('id')->on('quotation_purchase_orders')->nullOnDelete();
            $table->string('sales_order_id', 30)->nullable();
            $table->foreign('sales_order_id')->references('id')->on('sales_orders')->nullOnDelete();
            $table->string('source_label', 255);
            $table->string('path', 512);
            $table->string('original_name', 255);
            $table->string('mime_type', 100);
            $table->unsignedBigInteger('size');
            $table->timestamps();
            $table->index(['lead_id', 'created_at']);
            $table->index('quotation_id');
            $table->index('purchase_order_id');
            $table->index('sales_order_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('lead_payment_proofs');
    }
};
