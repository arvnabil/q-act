<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('quotation_sales_notes')) {
            Schema::create('quotation_sales_notes', function (Blueprint $table) {
                $table->id();
                $table->string('quotation_id');
                $table->json('adjustments')->nullable();
                $table->timestamps();

                $table->foreign('quotation_id')->references('id')->on('quotations')->onDelete('cascade');
                $table->unique('quotation_id');
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('quotation_sales_notes');
    }
};
