<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        $this->ensureForeignKeyEngines();

        if (! Schema::hasTable('lead_payment_proofs')) {
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

            return;
        }

        // Some local databases already have the columns from an interrupted or
        // manually-created table. Reconcile indexes and constraints instead of
        // failing with "table already exists" on retry.
        Schema::table('lead_payment_proofs', function (Blueprint $table) {
            if (! Schema::hasIndex('lead_payment_proofs', 'lead_payment_proofs_lead_id_created_at_index')) {
                $table->index(['lead_id', 'created_at']);
            }
            if (! Schema::hasIndex('lead_payment_proofs', 'lead_payment_proofs_quotation_id_index')) {
                $table->index('quotation_id');
            }
            if (! Schema::hasIndex('lead_payment_proofs', 'lead_payment_proofs_purchase_order_id_index')) {
                $table->index('purchase_order_id');
            }
            if (! Schema::hasIndex('lead_payment_proofs', 'lead_payment_proofs_sales_order_id_index')) {
                $table->index('sales_order_id');
            }
            if (! Schema::hasForeignKey('lead_payment_proofs', 'lead_payment_proofs_lead_id_foreign')) {
                $table->foreign('lead_id')->references('id')->on('leads')->cascadeOnDelete();
            }
            if (! Schema::hasForeignKey('lead_payment_proofs', 'lead_payment_proofs_uploaded_by_foreign')) {
                $table->foreign('uploaded_by')->references('id')->on('users')->nullOnDelete();
            }
            if (! Schema::hasForeignKey('lead_payment_proofs', 'lead_payment_proofs_quotation_id_foreign')) {
                $table->foreign('quotation_id')->references('id')->on('quotations')->nullOnDelete();
            }
            if (! Schema::hasForeignKey('lead_payment_proofs', 'lead_payment_proofs_purchase_order_id_foreign')) {
                $table->foreign('purchase_order_id')->references('id')->on('quotation_purchase_orders')->nullOnDelete();
            }
            if (! Schema::hasForeignKey('lead_payment_proofs', 'lead_payment_proofs_sales_order_id_foreign')) {
                $table->foreign('sales_order_id')->references('id')->on('sales_orders')->nullOnDelete();
            }
        });
    }

    private function ensureForeignKeyEngines(): void
    {
        if (DB::connection()->getDriverName() !== 'mysql') {
            return;
        }

        foreach (['leads', 'quotation_purchase_orders'] as $table) {
            if (! Schema::hasTable($table)) {
                continue;
            }

            $engine = DB::selectOne(
                'SELECT ENGINE FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?',
                [$table],
            )?->ENGINE;

            if ($engine && strtolower($engine) !== 'innodb') {
                DB::statement("ALTER TABLE `{$table}` ENGINE=InnoDB");
            }
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('lead_payment_proofs');
    }
};
