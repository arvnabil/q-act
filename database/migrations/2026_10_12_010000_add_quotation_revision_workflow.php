<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('quotations', function (Blueprint $table) {
            $table->string('parent_quotation_id', 30)->nullable()->after('id');
            $table->string('source_sales_order_id', 30)->nullable()->after('parent_quotation_id');
            $table->unsignedInteger('revision_no')->default(0)->after('source_sales_order_id');
            $table->foreign('parent_quotation_id')->references('id')->on('quotations')->nullOnDelete();
            $table->foreign('source_sales_order_id')->references('id')->on('sales_orders')->nullOnDelete();
        });

        Schema::table('sales_orders', function (Blueprint $table) {
            $table->string('parent_sales_order_id', 30)->nullable()->after('id');
            $table->foreign('parent_sales_order_id')->references('id')->on('sales_orders')->nullOnDelete();
        });

        Schema::create('change_requests', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('type', 30); // revision or cancellation
            $table->string('status', 30)->default('pending');
            $table->string('quotation_id', 30);
            $table->string('sales_order_id', 30)->nullable();
            $table->foreignUuid('requested_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignUuid('approved_by')->nullable()->constrained('users')->nullOnDelete();
            $table->string('resulting_quotation_id', 30)->nullable();
            $table->text('reason');
            $table->text('manager_comment')->nullable();
            $table->timestamps();

            $table->foreign('quotation_id')->references('id')->on('quotations')->cascadeOnDelete();
            $table->foreign('sales_order_id')->references('id')->on('sales_orders')->nullOnDelete();
            $table->foreign('resulting_quotation_id')->references('id')->on('quotations')->nullOnDelete();
            $table->index(['status', 'type']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('change_requests');
        Schema::table('sales_orders', function (Blueprint $table) {
            $table->dropForeign(['parent_sales_order_id']);
            $table->dropColumn('parent_sales_order_id');
        });
        Schema::table('quotations', function (Blueprint $table) {
            $table->dropForeign(['parent_quotation_id']);
            $table->dropForeign(['source_sales_order_id']);
            $table->dropColumn(['parent_quotation_id', 'source_sales_order_id', 'revision_no']);
        });
    }
};
