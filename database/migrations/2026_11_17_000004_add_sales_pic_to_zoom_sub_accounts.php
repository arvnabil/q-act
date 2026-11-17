<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('zoom_sub_accounts', function (Blueprint $table) {
            $table->uuid('sales_pic_id')->nullable()->after('customer_id')->index();
            $table->foreign('sales_pic_id')->references('id')->on('users')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('zoom_sub_accounts', function (Blueprint $table) {
            $table->dropForeign(['sales_pic_id']);
            $table->dropColumn('sales_pic_id');
        });
    }
};
