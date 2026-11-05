<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
return new class extends Migration {
    public function up(): void { Schema::table('customer_pics', fn (Blueprint $table) => $table->json('crm_profile')->nullable()); }
    public function down(): void { Schema::table('customer_pics', fn (Blueprint $table) => $table->dropColumn('crm_profile')); }
};
