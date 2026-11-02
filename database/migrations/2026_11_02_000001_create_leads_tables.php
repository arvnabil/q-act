<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // ─── leads ────────────────────────────────────────────────────────────
        Schema::create('leads', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('lead_code', 20)->unique()->nullable();
            $table->string('title', 255);

            // Customer snapshot (FK + denormalised copy for leads without a customer record)
            $table->string('customer_id', 15)->nullable();
            $table->foreign('customer_id')->references('id')->on('customers')->nullOnDelete();
            $table->string('customer_name', 255)->nullable();
            $table->string('customer_phone', 50)->nullable();
            $table->string('customer_email', 100)->nullable();
            $table->text('customer_address')->nullable();

            // PIC
            $table->string('pic_name', 255)->nullable();
            $table->string('pic_phone', 50)->nullable();

            // Ownership
            $table->uuid('sales_id')->nullable();
            $table->foreign('sales_id')->references('id')->on('users')->nullOnDelete();
            $table->uuid('bu_id')->nullable();
            $table->foreign('bu_id')->references('id')->on('business_units')->nullOnDelete();

            // Pipeline
            $table->string('stage', 50)->default('data_masuk');
            $table->string('source', 100)->nullable();
            $table->decimal('estimated_value', 15, 2)->default(0);

            // Linked quotation
            $table->string('quotation_id', 30)->nullable();
            $table->foreign('quotation_id')->references('id')->on('quotations')->nullOnDelete();

            // Misc
            $table->text('notes')->nullable();
            $table->text('lost_reason')->nullable();
            $table->json('tags')->nullable();
            $table->integer('sort_order')->default(0);
            $table->boolean('is_archived')->default(false);

            // Audit
            $table->uuid('created_by')->nullable();
            $table->foreign('created_by')->references('id')->on('users')->nullOnDelete();
            $table->uuid('updated_by')->nullable();
            $table->foreign('updated_by')->references('id')->on('users')->nullOnDelete();
            $table->timestamp('converted_at')->nullable();

            $table->timestamps();
        });

        // ─── lead_activities ──────────────────────────────────────────────────
        Schema::create('lead_activities', function (Blueprint $table) {
            $table->uuid('id')->primary();

            $table->uuid('lead_id');
            $table->foreign('lead_id')->references('id')->on('leads')->cascadeOnDelete();

            $table->uuid('user_id')->nullable();
            $table->foreign('user_id')->references('id')->on('users')->nullOnDelete();

            $table->string('type', 50)->default('note');
            $table->string('title', 255)->nullable();
            $table->text('description')->nullable();
            $table->timestamp('scheduled_at')->nullable();
            $table->timestamp('completed_at')->nullable();
            $table->json('metadata')->nullable();

            $table->timestamps();
        });

        // ─── lead_visits ──────────────────────────────────────────────────────
        Schema::create('lead_visits', function (Blueprint $table) {
            $table->uuid('id')->primary();

            $table->uuid('lead_id')->nullable();
            $table->foreign('lead_id')->references('id')->on('leads')->nullOnDelete();

            $table->uuid('user_id');
            $table->foreign('user_id')->references('id')->on('users')->cascadeOnDelete();

            $table->string('customer_id', 15)->nullable();
            $table->foreign('customer_id')->references('id')->on('customers')->nullOnDelete();

            $table->string('visit_type', 30)->default('visit');
            $table->string('subject', 255);
            $table->string('location', 255)->nullable();
            $table->timestamp('scheduled_at');
            $table->timestamp('checked_in_at')->nullable();
            $table->decimal('checked_in_lat', 10, 7)->nullable();
            $table->decimal('checked_in_lng', 10, 7)->nullable();
            $table->text('notes')->nullable();
            $table->string('outcome', 255)->nullable();

            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('lead_visits');
        Schema::dropIfExists('lead_activities');
        Schema::dropIfExists('leads');
    }
};
