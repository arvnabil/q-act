<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::table('business_units', function (Blueprint $table) {
            $table->uuid('default_sales_id')->nullable()->after('description');
        });
    }
    public function down(): void {
        Schema::table('business_units', function (Blueprint $table) {
            $table->dropColumn('default_sales_id');
        });
    }
};
