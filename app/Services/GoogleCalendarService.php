<?php

namespace App\Services;

use App\Models\SystemSetting;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * Google Calendar Service (Service Account / HTTP-based, no composer SDK needed)
 *
 * Credentials stored in SystemSetting key: 'google_calendar_credentials'
 * Value shape: { "type":"service_account", "project_id":..., "private_key_id":...,
 *                "private_key":..., "client_email":..., "calendar_id":... }
 *
 * The service account must have "Editor" access to the shared team calendar.
 */
class GoogleCalendarService
{
    private ?array $creds = null;
    private ?string $calendarId = null;

    public function __construct()
    {
        $setting = SystemSetting::find('google_calendar_credentials');
        if ($setting && is_array($setting->value)) {
            $this->creds = $setting->value;
            $this->calendarId = $setting->value['calendar_id'] ?? null;
        }
    }

    public function isConfigured(): bool
    {
        return !empty($this->creds)
            && !empty($this->creds['private_key'])
            && !empty($this->creds['client_email'])
            && !empty($this->calendarId);
    }

    // ─── JWT + Access Token ──────────────────────────────────────────────────────

    private function getAccessToken(): ?string
    {
        if (!$this->isConfigured()) return null;

        $now  = time();
        $exp  = $now + 3600;
        $iss  = $this->creds['client_email'];
        $scope = 'https://www.googleapis.com/auth/calendar';

        // Build JWT header + claim
        $header = base64_encode(json_encode(['alg' => 'RS256', 'typ' => 'JWT']));
        $claim  = base64_encode(json_encode([
            'iss'   => $iss,
            'scope' => $scope,
            'aud'   => 'https://oauth2.googleapis.com/token',
            'exp'   => $exp,
            'iat'   => $now,
        ]));
        $headerClaim = $header . '.' . $claim;

        // Sign with private key
        $privateKey = $this->creds['private_key'];
        $signature  = '';
        $ok = openssl_sign($headerClaim, $signature, $privateKey, OPENSSL_ALGO_SHA256);
        if (!$ok) {
            Log::error('[GoogleCalendar] openssl_sign failed');
            return null;
        }

        $jwt = $headerClaim . '.' . base64_encode($signature);

        // Exchange JWT for access token
        $response = Http::asForm()->post('https://oauth2.googleapis.com/token', [
            'grant_type' => 'urn:ietf:params:oauth:grant-type:jwt-bearer',
            'assertion'  => $jwt,
        ]);

        if ($response->failed()) {
            Log::error('[GoogleCalendar] Token exchange failed', $response->json());
            return null;
        }

        return $response->json('access_token');
    }

    // ─── Event CRUD ─────────────────────────────────────────────────────────────

    /**
     * Create a calendar event and return the event ID.
     */
    public function createEvent(array $payload): ?string
    {
        $token = $this->getAccessToken();
        if (!$token) return null;

        $response = Http::withToken($token)
            ->post("https://www.googleapis.com/calendar/v3/calendars/{$this->calendarId}/events", $payload);

        // If failed due to Service Account restriction on attendees, retry without attendees
        if ($response->failed() && !empty($payload['attendees'])) {
            $err = $response->json();
            $reason = $err['error']['errors'][0]['reason'] ?? '';
            if ($reason === 'forbiddenForServiceAccounts' || $response->status() === 403) {
                Log::info('[GoogleCalendar] Retrying createEvent without attendees due to Service Account restriction');
                unset($payload['attendees']);
                $response = Http::withToken($token)
                    ->post("https://www.googleapis.com/calendar/v3/calendars/{$this->calendarId}/events", $payload);
            }
        }

        if ($response->failed()) {
            Log::error('[GoogleCalendar] createEvent failed', $response->json());
            return null;
        }

        return $response->json('id');
    }

    /**
     * Update an existing calendar event.
     */
    public function updateEvent(string $eventId, array $payload): bool
    {
        $token = $this->getAccessToken();
        if (!$token) return false;

        $response = Http::withToken($token)
            ->patch("https://www.googleapis.com/calendar/v3/calendars/{$this->calendarId}/events/{$eventId}", $payload);

        // If failed due to Service Account restriction on attendees, retry without attendees
        if ($response->failed() && !empty($payload['attendees'])) {
            $err = $response->json();
            $reason = $err['error']['errors'][0]['reason'] ?? '';
            if ($reason === 'forbiddenForServiceAccounts' || $response->status() === 403) {
                Log::info('[GoogleCalendar] Retrying updateEvent without attendees due to Service Account restriction');
                unset($payload['attendees']);
                $response = Http::withToken($token)
                    ->patch("https://www.googleapis.com/calendar/v3/calendars/{$this->calendarId}/events/{$eventId}", $payload);
            }
        }

        if ($response->failed()) {
            Log::error('[GoogleCalendar] updateEvent failed', $response->json());
            return false;
        }

        return true;
    }

    /**
     * Delete a calendar event.
     */
    public function deleteEvent(string $eventId): bool
    {
        $token = $this->getAccessToken();
        if (!$token) return false;

        $response = Http::withToken($token)
            ->delete("https://www.googleapis.com/calendar/v3/calendars/{$this->calendarId}/events/{$eventId}");

        if ($response->failed() && $response->status() !== 410) { // 410 = already deleted
            Log::error('[GoogleCalendar] deleteEvent failed', ['status' => $response->status()]);
            return false;
        }

        return true;
    }

    // ─── Helpers ────────────────────────────────────────────────────────────────

    /**
     * Build a Google Calendar event body from a LeadVisit-like object.
     */
    public static function buildEventBody(
        string $summary,
        string $description,
        string $startDatetime,
        string $endDatetime,
        ?string $location = null,
        ?string $zoomJoinUrl = null,
        bool $isAllDay = false,
        ?array $attendees = null
    ): array {
        if ($zoomJoinUrl) {
            $description .= "\n\n🎥 Zoom Meeting: {$zoomJoinUrl}";
        }

        if ($isAllDay) {
            $body = [
                'summary'     => $summary,
                'description' => $description,
                'start'       => ['date' => substr($startDatetime, 0, 10)],
                'end'         => ['date' => substr($endDatetime, 0, 10)],
            ];
        } else {
            $body = [
                'summary'     => $summary,
                'description' => $description,
                'start'       => ['dateTime' => $startDatetime, 'timeZone' => 'Asia/Jakarta'],
                'end'         => ['dateTime' => $endDatetime,   'timeZone' => 'Asia/Jakarta'],
            ];
        }

        if ($location) {
            $body['location'] = $location;
        }

        if (!empty($attendees)) {
            $body['attendees'] = array_map(fn($email) => ['email' => $email], array_filter($attendees));
        }

        return $body;
    }
}

