<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Add Google Calendar + Zoom columns to lead_visits
        Schema::table('lead_visits', function (Blueprint $table) {
            if (!Schema::hasColumn('lead_visits', 'gc_event_id')) {
                $table->string('gc_event_id')->nullable()->after('outcome');
            }
            if (!Schema::hasColumn('lead_visits', 'zoom_meeting_id')) {
                $table->string('zoom_meeting_id')->nullable()->after('gc_event_id');
            }
            if (!Schema::hasColumn('lead_visits', 'zoom_join_url')) {
                $table->string('zoom_join_url')->nullable()->after('zoom_meeting_id');
            }
            if (!Schema::hasColumn('lead_visits', 'zoom_recording_url')) {
                $table->string('zoom_recording_url')->nullable()->after('zoom_join_url');
            }
        });

        // Add Zoom license flag to users
        Schema::table('users', function (Blueprint $table) {
            if (!Schema::hasColumn('users', 'has_zoom_license')) {
                $table->boolean('has_zoom_license')->default(false)->after('is_active');
            }
            if (!Schema::hasColumn('users', 'google_calendar_email')) {
                $table->string('google_calendar_email')->nullable()->after('has_zoom_license');
            }
        });
    }

    public function down(): void
    {
        Schema::table('lead_visits', function (Blueprint $table) {
            $table->dropColumnIfExists('gc_event_id');
            $table->dropColumnIfExists('zoom_meeting_id');
            $table->dropColumnIfExists('zoom_join_url');
            $table->dropColumnIfExists('zoom_recording_url');
        });

        Schema::table('users', function (Blueprint $table) {
            $table->dropColumnIfExists('has_zoom_license');
            $table->dropColumnIfExists('google_calendar_email');
        });
    }
};

