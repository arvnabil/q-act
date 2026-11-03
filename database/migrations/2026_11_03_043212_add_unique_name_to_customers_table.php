<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // First, trim any whitespace from existing names to prevent constraint issues
        DB::statement("UPDATE customers SET name = TRIM(name) WHERE name != TRIM(name)");

        Schema::table('customers', function (Blueprint $table) {
            $table->unique('name', 'customers_name_unique');
        });
    }

    public function down(): void
    {
        Schema::table('customers', function (Blueprint $table) {
            $table->dropUnique('customers_name_unique');
        });
    }
};
