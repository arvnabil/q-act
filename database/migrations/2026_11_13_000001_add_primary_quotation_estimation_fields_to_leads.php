<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('leads', function (Blueprint $table) {
            $table->string('estimation_source', 24)->default('manual');
            $table->boolean('quotation_needs_review')->default(false);
        });

        // Backfill only unambiguous, already-linked Sent quotations. Existing
        // manual estimates without a sent primary remain untouched.
        DB::table('leads')->whereNotNull('quotation_id')->orderBy('id')->chunkById(100, function ($leads) {
            foreach ($leads as $lead) {
                $quotation = DB::table('quotations')->where('id', $lead->quotation_id)
                    ->where('status', 'sent')->where('is_deleted', false)->first();
                if ($quotation) {
                    DB::table('leads')->where('id', $lead->id)->update([
                        'estimated_value' => $quotation->grand_total,
                        'estimation_source' => 'primary_quotation',
                    ]);
                }
            }
        });
    }

    public function down(): void
    {
        Schema::table('leads', function (Blueprint $table) {
            $table->dropColumn(['estimation_source', 'quotation_needs_review']);
        });
    }
};
