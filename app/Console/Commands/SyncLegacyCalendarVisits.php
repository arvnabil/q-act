<?php

namespace App\Console\Commands;

use App\Models\LeadVisit;
use App\Services\GoogleCalendarService;
use App\Services\LeadVisitCalendarSyncService;
use Illuminate\Console\Command;

class SyncLegacyCalendarVisits extends Command
{
    protected $signature = 'calendar:sync-legacy-visits {--dry-run : Show the number of eligible legacy events without syncing}';

    protected $description = 'Move legacy service-account visit events to the configured Google OAuth calendar';

    public function handle(GoogleCalendarService $googleCalendar, LeadVisitCalendarSyncService $syncService): int
    {
        if (! $this->option('dry-run') && ! $googleCalendar->isConfigured()) {
            $this->error('Google OAuth must be connected before syncing legacy events.');

            return self::FAILURE;
        }

        $query = LeadVisit::query()
            ->where('sync_google_calendar', true)
            ->where('google_sync_status', 'legacy')
            ->orderBy('created_at');
        $count = (clone $query)->count();

        if ($this->option('dry-run')) {
            $this->info("{$count} legacy calendar visit(s) eligible for sync.");

            return self::SUCCESS;
        }

        $this->info("Syncing {$count} legacy calendar visit(s)...");
        $synced = 0;
        $failed = 0;

        $query->chunkById(100, function ($visits) use ($syncService, &$synced, &$failed) {
            foreach ($visits as $visit) {
                $warnings = $syncService->sync($visit);
                $visit->refresh();
                if ($visit->google_sync_status === 'synced') {
                    $synced++;
                } else {
                    $failed++;
                    $this->warn("{$visit->id}: ".implode(' ', $warnings));
                }
            }
        });

        $this->info("Completed: {$synced} synced, {$failed} failed.");

        return $failed === 0 ? self::SUCCESS : self::FAILURE;
    }
}
