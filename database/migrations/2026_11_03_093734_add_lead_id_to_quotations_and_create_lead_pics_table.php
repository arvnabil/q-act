<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // ─── Add lead_id to quotations (nullable — existing quotations unaffected) ───
        if (!Schema::hasColumn('quotations', 'lead_id')) {
            Schema::table('quotations', function (Blueprint $table) {
                $table->uuid('lead_id')->nullable()->after('id');
            });
        }

        try {
            Schema::table('quotations', function (Blueprint $table) {
                $table->foreign('lead_id')->references('id')->on('leads')->nullOnDelete();
            });
        } catch (\Throwable $e) {
            // FK might already be set or error caught
        }

        // ─── lead_pics pivot: link Customer PICs to a Lead with role context ─────────
        if (!Schema::hasTable('lead_pics')) {
            Schema::create('lead_pics', function (Blueprint $table) {
                $table->uuid('id')->primary();

                $table->uuid('lead_id');
                $table->foreign('lead_id')->references('id')->on('leads')->cascadeOnDelete();

                // References an existing customer_pic
                $table->unsignedBigInteger('customer_pic_id')->nullable();
                $table->foreign('customer_pic_id')->references('id')->on('customer_pics')->nullOnDelete();

                // Standalone PIC info (for leads that don't have a Customer yet)
                $table->string('name', 255)->nullable();
                $table->string('phone', 50)->nullable();
                $table->string('email', 100)->nullable();
                $table->string('position', 100)->nullable();

                $table->enum('role', ['primary', 'technical', 'purchasing', 'finance', 'other'])->default('primary');
                $table->boolean('is_primary')->default(false);

                $table->uuid('created_by')->nullable();
                $table->foreign('created_by')->references('id')->on('users')->nullOnDelete();

                $table->timestamps();
            });
        }
    }

    public function down(): void
    {
        Schema::table('quotations', function (Blueprint $table) {
            try {
                $table->dropForeign(['lead_id']);
            } catch (\Throwable $e) {}
            if (Schema::hasColumn('quotations', 'lead_id')) {
                $table->dropColumn('lead_id');
            }
        });

        Schema::dropIfExists('lead_pics');
    }
};
