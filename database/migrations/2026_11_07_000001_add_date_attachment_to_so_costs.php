<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::table('sales_order_costs', function (Blueprint $table) {
            $table->date('cost_date')->nullable()->after('description');
            $table->string('attachment_path')->nullable()->after('amount');
        });
    }
    public function down(): void {
        Schema::table('sales_order_costs', function (Blueprint $table) {
            $table->dropColumn(['cost_date', 'attachment_path']);
        });
    }
};
