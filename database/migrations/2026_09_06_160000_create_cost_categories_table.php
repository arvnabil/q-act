<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('cost_categories', function (Blueprint $table) {
            $table->id();
            $table->string('name')->unique();
            $table->boolean('is_default')->default(false);
            $table->integer('sort_order')->default(0);
            $table->timestamps();
        });

        // Seed default categories
        $defaultCategories = [
            ['name' => 'BOD Expenses', 'is_default' => true, 'sort_order' => 1, 'created_at' => now(), 'updated_at' => now()],
            ['name' => 'Entertainment', 'is_default' => true, 'sort_order' => 2, 'created_at' => now(), 'updated_at' => now()],
            ['name' => 'Administration', 'is_default' => true, 'sort_order' => 3, 'created_at' => now(), 'updated_at' => now()],
            ['name' => 'Transport & Accommodation', 'is_default' => true, 'sort_order' => 4, 'created_at' => now(), 'updated_at' => now()],
            ['name' => 'Others / Shipping/ Import', 'is_default' => true, 'sort_order' => 5, 'created_at' => now(), 'updated_at' => now()],
        ];

        DB::table('cost_categories')->insert($defaultCategories);

        Schema::table('sales_order_costs', function (Blueprint $table) {
            $table->foreignId('cost_category_id')->nullable()->constrained('cost_categories')->nullOnDelete();
            $table->string('category_name')->nullable();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('sales_order_costs', function (Blueprint $table) {
            $table->dropForeign(['cost_category_id']);
            $table->dropColumn(['cost_category_id', 'category_name']);
        });

        Schema::dropIfExists('cost_categories');
    }
};
