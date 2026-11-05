<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('lead_visits', function (Blueprint $t) {
            $t->string('quotation_id', 30)->nullable()->index();
            $t->uuid('lead_activity_id')->nullable()->unique();
            $t->timestamp('cancelled_at')->nullable();
        });
        // Preserve existing scheduled activities as one agenda each. No external calls.
        DB::table('lead_activities')->whereNotNull('scheduled_at')->orderBy('id')->chunkById(100, function ($rows) {
            foreach ($rows as $a) {
                $lead = DB::table('leads')->where('id', $a->lead_id)->first();
                $owner = $a->user_id ?: ($lead->sales_id ?? $lead->created_by ?? null);
                if (! $owner) {
                    continue;
                }
                DB::table('lead_visits')->insertOrIgnore([
                    'id' => (string) Str::uuid(), 'lead_id' => $a->lead_id, 'lead_activity_id' => $a->id,
                    'user_id' => $owner, 'customer_id' => $lead->customer_id ?? null,
                    'visit_type' => 'follow_up', 'subject' => mb_substr('Follow-up: '.$a->title, 0, 255),
                    'scheduled_at' => $a->scheduled_at, 'checked_in_at' => $a->completed_at,
                    'notes' => $a->description, 'created_at' => $a->created_at, 'updated_at' => $a->updated_at,
                ]);
            }
        });
    }

    public function down(): void
    {
        // Do not delete agenda history during rollback.
        Schema::table('lead_visits', function (Blueprint $t) {
            $t->dropIndex(['quotation_id']);
            $t->dropUnique(['lead_activity_id']);
        });
        Schema::table('lead_visits', fn (Blueprint $t) => $t->dropColumn(['quotation_id', 'lead_activity_id', 'cancelled_at']));
    }
};
