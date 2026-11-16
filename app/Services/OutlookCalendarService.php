<?php

namespace App\Services;

use App\Models\LeadVisit;
use Carbon\Carbon;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use RuntimeException;

class OutlookCalendarService
{
    public function __construct(private readonly MicrosoftGraphTokenService $tokenService) {}

    public function organizerMailbox(): ?string
    {
        return config('services.outlook_calendar.mailbox');
    }

    public function isConfigured(): bool
    {
        $graph = config('mail.mailers.microsoft-graph', []);

        return filled($this->organizerMailbox())
            && filled($graph['tenant_id'] ?? null)
            && filled($graph['client_id'] ?? null)
            && filled($graph['client_secret'] ?? null);
    }

    public function createEvent(LeadVisit $visit, array $attendees, string $description): string
    {
        $response = $this->client()->post($this->eventsUrl(), $this->payload($visit, $attendees, $description));
        if ($response->failed()) {
            Log::warning('[OutlookCalendar] Event creation failed.', ['status' => $response->status(), 'error' => $response->json('error.message')]);
            throw new RuntimeException('Outlook gagal membuat undangan. Periksa izin Calendars.ReadWrite dan mailbox no-reply.');
        }

        $eventId = $response->json('id');
        if (! is_string($eventId) || $eventId === '') {
            throw new RuntimeException('Outlook tidak mengembalikan ID event setelah undangan dibuat.');
        }

        return $eventId;
    }

    public function updateEvent(LeadVisit $visit, string $eventId, array $attendees, string $description): bool
    {
        $response = $this->client()->patch($this->eventsUrl().'/'.rawurlencode($eventId), $this->payload($visit, $attendees, $description));
        if ($response->failed()) {
            Log::warning('[OutlookCalendar] Event update failed.', ['status' => $response->status(), 'error' => $response->json('error.message')]);

            return false;
        }

        return true;
    }

    public function deleteEvent(string $eventId): bool
    {
        $response = $this->client()->delete($this->eventsUrl().'/'.rawurlencode($eventId));
        if ($response->failed() && $response->status() !== 404) {
            Log::warning('[OutlookCalendar] Event deletion failed.', ['status' => $response->status()]);

            return false;
        }

        return true;
    }

    private function payload(LeadVisit $visit, array $attendees, string $description): array
    {
        if ($visit->is_all_day) {
            // All-day dates are date-only values stored at midnight/end-of-day in app timezone.
            // Preserve the calendar date; converting UTC end-of-day to Jakarta first shifts it
            // into tomorrow and makes a single-day event span two dates in Outlook.
            $start = Carbon::parse($visit->scheduled_at)->startOfDay();
            $end = Carbon::parse($visit->end_at ?: $visit->scheduled_at)->startOfDay()->addDay();
            $startValue = $start->format('Y-m-d\TH:i:s');
            $endValue = $end->format('Y-m-d\TH:i:s');
        } else {
            $start = Carbon::parse($visit->scheduled_at)->setTimezone('Asia/Jakarta');
            $end = Carbon::parse($visit->end_at ?: $visit->scheduled_at)->setTimezone('Asia/Jakarta');
            $startValue = $start->format('Y-m-d\TH:i:s');
            $endValue = $end->format('Y-m-d\TH:i:s');
        }

        $payload = [
            'subject' => $visit->subject,
            'body' => ['contentType' => 'text', 'content' => $description],
            'start' => ['dateTime' => $startValue, 'timeZone' => 'SE Asia Standard Time'],
            'end' => ['dateTime' => $endValue, 'timeZone' => 'SE Asia Standard Time'],
            'isAllDay' => (bool) $visit->is_all_day,
            'attendees' => array_values(array_map(fn (string $email) => [
                'emailAddress' => ['address' => $email],
                'type' => 'required',
            ], $attendees)),
            'transactionId' => 'qact-'.str_replace('-', '', (string) $visit->id),
        ];

        if ($visit->location) {
            $payload['location'] = ['displayName' => $visit->location];
        }

        return $payload;
    }

    private function client()
    {
        if (! $this->isConfigured()) {
            throw new RuntimeException('Outlook Calendar belum dikonfigurasi.');
        }

        return Http::withHeaders($this->tokenService->getAuthorizedHeaders())
            ->acceptJson()->asJson()->timeout(25);
    }

    private function eventsUrl(): string
    {
        return 'https://graph.microsoft.com/v1.0/users/'.rawurlencode((string) $this->organizerMailbox()).'/calendar/events';
    }
}
