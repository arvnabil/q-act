<?php

namespace App\Services;

use App\Models\LeadVisit;
use Carbon\Carbon;
use Illuminate\Contracts\Cache\LockTimeoutException;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;

class LeadVisitCalendarSyncService
{
    public function __construct(
        private readonly GoogleCalendarService $googleCalendar,
        private readonly OutlookCalendarService $outlookCalendar,
    ) {}

    public function sync(LeadVisit $visit): array
    {
        try {
            return Cache::lock('lead_visit_calendar_sync_'.$visit->id, 90)->block(10, function () use ($visit) {
                $visit->refresh()->loadMissing(['user:id,name,email', 'lead:id,title,lead_code', 'quotation:id']);
                $attendees = $this->attendees($visit);
                $description = $this->description($visit);
                $warnings = [];

                $warnings = array_merge($warnings, $this->syncGoogle($visit, $attendees, $description));
                $warnings = array_merge($warnings, $this->syncOutlook($visit, $attendees, $description));

                return $warnings;
            });
        } catch (LockTimeoutException) {
            return ['Agenda sedang disinkronkan oleh permintaan lain. Periksa kembali beberapa saat lagi.'];
        }
    }

    public function deleteProviderEvents(LeadVisit $visit): array
    {
        $warnings = [];

        if ($visit->gc_event_id) {
            try {
                if (! $this->googleCalendar->deleteEvent($visit->gc_event_id)) {
                    throw new \RuntimeException('Google Calendar menolak pembatalan event.');
                }
                $visit->forceFill([
                    'gc_event_id' => null,
                    'sync_google_calendar' => false,
                    'google_sync_status' => 'cancelled',
                    'google_sync_error' => null,
                ])->save();
            } catch (\Throwable $exception) {
                Log::warning('[LeadVisit] Google event cancellation failed.', ['visit_id' => $visit->id, 'message' => $exception->getMessage()]);
                $visit->forceFill([
                    'google_sync_status' => 'failed',
                    'google_sync_error' => mb_substr($exception->getMessage(), 0, 1000),
                ])->save();
                $warnings[] = 'Event Google Calendar belum berhasil dibatalkan.';
            }
        }

        if ($visit->outlook_event_id) {
            try {
                if (! $this->outlookCalendar->deleteEvent($visit->outlook_event_id)) {
                    throw new \RuntimeException('Outlook Calendar menolak pembatalan event.');
                }
                $visit->forceFill([
                    'outlook_event_id' => null,
                    'sync_outlook_calendar' => false,
                    'outlook_sync_status' => 'cancelled',
                    'outlook_sync_error' => null,
                ])->save();
            } catch (\Throwable $exception) {
                Log::warning('[LeadVisit] Outlook event cancellation failed.', ['visit_id' => $visit->id, 'message' => $exception->getMessage()]);
                $visit->forceFill([
                    'outlook_sync_status' => 'failed',
                    'outlook_sync_error' => mb_substr($exception->getMessage(), 0, 1000),
                ])->save();
                $warnings[] = 'Event Outlook Calendar belum berhasil dibatalkan.';
            }
        }

        return $warnings;
    }

    private function syncGoogle(LeadVisit $visit, array $attendees, string $description): array
    {
        if (! $visit->sync_google_calendar) {
            if ($visit->gc_event_id) {
                try {
                    $deleted = $this->googleCalendar->deleteEvent($visit->gc_event_id);
                    if (! $deleted) {
                        throw new \RuntimeException('Google Calendar gagal membatalkan event.');
                    }
                    $visit->forceFill(['gc_event_id' => null, 'google_sync_status' => 'disabled', 'google_sync_error' => null])->save();
                } catch (\Throwable $exception) {
                    $visit->forceFill(['google_sync_status' => 'failed', 'google_sync_error' => $exception->getMessage()])->save();

                    return ['Agenda tersimpan, tetapi event Google Calendar belum berhasil dibatalkan.'];
                }
            }

            return [];
        }

        try {
            if (! $this->googleCalendar->isConfigured()) {
                throw new \RuntimeException('Google Calendar belum tersambung melalui OAuth. Hubungkan akun di Pengaturan.');
            }

            $payload = GoogleCalendarService::buildEventBody(
                $visit->subject,
                $description,
                $visit->is_all_day ? $visit->scheduled_at->format('Y-m-d') : $visit->scheduled_at->toIso8601String(),
                $visit->is_all_day
                    ? Carbon::parse($visit->end_at ?: $visit->scheduled_at)->addDay()->format('Y-m-d')
                    : ($visit->end_at ?: $visit->scheduled_at)->toIso8601String(),
                $visit->location,
                $visit->zoom_join_url,
                (bool) $visit->is_all_day,
                $attendees,
            );
            $eventId = null;
            if ($visit->gc_event_id && $this->googleCalendar->updateEvent($visit->gc_event_id, $payload)) {
                $eventId = $visit->gc_event_id;
            } else {
                // A legacy service-account event may not exist in the OAuth
                // calendar. Recreate with a deterministic ID for retry safety.
                $eventId = $this->googleCalendar->createEvent($payload, $this->googleEventId($visit));
            }

            $visit->forceFill([
                'gc_event_id' => $eventId,
                'google_sync_status' => 'synced',
                'google_sync_error' => null,
                'google_synced_at' => now(),
            ])->save();

            return [];
        } catch (\Throwable $exception) {
            $visit->forceFill(['google_sync_status' => 'failed', 'google_sync_error' => mb_substr($exception->getMessage(), 0, 1000)])->save();

            return ['Agenda tersimpan, tetapi sinkronisasi Google Calendar gagal: '.$exception->getMessage()];
        }
    }

    private function syncOutlook(LeadVisit $visit, array $attendees, string $description): array
    {
        if (! $visit->sync_outlook_calendar) {
            if ($visit->outlook_event_id) {
                try {
                    if (! $this->outlookCalendar->deleteEvent($visit->outlook_event_id)) {
                        throw new \RuntimeException('Outlook gagal membatalkan event.');
                    }
                    $visit->forceFill(['outlook_event_id' => null, 'outlook_sync_status' => 'disabled', 'outlook_sync_error' => null])->save();
                } catch (\Throwable $exception) {
                    $visit->forceFill(['outlook_sync_status' => 'failed', 'outlook_sync_error' => $exception->getMessage()])->save();

                    return ['Agenda tersimpan, tetapi event Outlook belum berhasil dibatalkan.'];
                }
            }

            return [];
        }

        try {
            if (! $this->outlookCalendar->isConfigured()) {
                throw new \RuntimeException('Microsoft Graph Calendar belum dikonfigurasi untuk mailbox no-reply.');
            }

            $eventId = $visit->outlook_event_id
                ? ($this->outlookCalendar->updateEvent($visit, $visit->outlook_event_id, $attendees, $description)
                    ? $visit->outlook_event_id
                    : throw new \RuntimeException('Outlook gagal memperbarui event.'))
                : $this->outlookCalendar->createEvent($visit, $attendees, $description);

            $visit->forceFill([
                'outlook_event_id' => $eventId,
                'outlook_sync_status' => 'synced',
                'outlook_sync_error' => null,
                'outlook_synced_at' => now(),
            ])->save();

            return [];
        } catch (\Throwable $exception) {
            $visit->forceFill(['outlook_sync_status' => 'failed', 'outlook_sync_error' => mb_substr($exception->getMessage(), 0, 1000)])->save();

            return ['Agenda tersimpan, tetapi undangan Outlook gagal: '.$exception->getMessage()];
        }
    }

    private function attendees(LeadVisit $visit): array
    {
        return collect($visit->attendee_emails ?? [])
            ->merge([$visit->user?->email])
            ->filter(fn ($email) => is_string($email) && filter_var($email, FILTER_VALIDATE_EMAIL))
            ->map(fn (string $email) => mb_strtolower(trim($email)))
            ->unique()
            ->values()
            ->all();
    }

    private function description(LeadVisit $visit): string
    {
        $description = $visit->subject;
        if ($visit->location) {
            $description .= "\n\nLokasi: ".$visit->location;
        }
        if ($visit->notes) {
            $description .= "\n\n".trim($visit->notes);
        }
        if ($visit->include_lead_info) {
            $description .= "\n\nSales: ".($visit->user?->name ?? '');
            if ($visit->lead) {
                $description .= "\nLead: {$visit->lead->lead_code} - {$visit->lead->title}";
            }
            if ($visit->quotation_id) {
                $description .= "\nQuotation: ".url('/quotations/'.$visit->quotation_id);
            }
        }

        return $description;
    }

    private function googleEventId(LeadVisit $visit): string
    {
        return 'qact'.substr(hash('sha256', (string) $visit->id), 0, 52);
    }
}
