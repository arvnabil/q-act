<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('lead_visits', function (Blueprint $table) {
            $table->boolean('sync_google_calendar')->default(false)->after('gc_event_id');
            $table->string('google_sync_status', 20)->nullable()->after('sync_google_calendar');
            $table->text('google_sync_error')->nullable()->after('google_sync_status');
            $table->timestamp('google_synced_at')->nullable()->after('google_sync_error');
            $table->boolean('sync_outlook_calendar')->default(false)->after('google_synced_at');
            $table->string('outlook_event_id')->nullable()->after('sync_outlook_calendar');
            $table->string('outlook_sync_status', 20)->nullable()->after('outlook_event_id');
            $table->text('outlook_sync_error')->nullable()->after('outlook_sync_status');
            $table->timestamp('outlook_synced_at')->nullable()->after('outlook_sync_error');
            $table->json('attendee_emails')->nullable()->after('outlook_synced_at');
            $table->boolean('include_lead_info')->default(true)->after('attendee_emails');
        });

        // Preserve existing Google links during the provider migration so visits
        // are surfaced for reconciliation instead of silently losing their state.
        DB::table('lead_visits')->whereNotNull('gc_event_id')->update([
            'sync_google_calendar' => true,
            'google_sync_status' => 'legacy',
        ]);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('lead_visits', function (Blueprint $table) {
            $table->dropColumn([
                'sync_google_calendar', 'google_sync_status', 'google_sync_error', 'google_synced_at',
                'sync_outlook_calendar', 'outlook_event_id', 'outlook_sync_status', 'outlook_sync_error', 'outlook_synced_at',
                'attendee_emails', 'include_lead_info',
            ]);
        });
    }
};
