<?php

namespace App\Services;

use App\Models\SystemSetting;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * Zoom Server-to-Server OAuth Service
 *
 * Credentials stored in SystemSetting key: 'zoom_credentials'
 * Value shape: { "account_id":"...", "client_id":"...", "client_secret":"..." }
 *
 * The Zoom app must have scopes: meeting:write:admin, meeting:read:admin
 */
class ZoomService
{
    private ?array $creds = null;

    public function __construct()
    {
        $setting = SystemSetting::find('zoom_credentials');
        if ($setting && is_array($setting->value)) {
            $this->creds = $setting->value;
        }
    }

    public function isConfigured(): bool
    {
        return !empty($this->creds)
            && !empty($this->creds['account_id'])
            && !empty($this->creds['client_id'])
            && !empty($this->creds['client_secret']);
    }

    // ─── OAuth Token ─────────────────────────────────────────────────────────────

    private function getAccessToken(): ?string
    {
        if (!$this->isConfigured()) return null;

        $response = Http::withBasicAuth(
            $this->creds['client_id'],
            $this->creds['client_secret']
        )->asForm()->post('https://zoom.us/oauth/token', [
            'grant_type' => 'account_credentials',
            'account_id' => $this->creds['account_id'],
        ]);

        if ($response->failed()) {
            Log::error('[Zoom] Token fetch failed', $response->json());
            return null;
        }

        return $response->json('access_token');
    }

    // ─── Meeting CRUD ────────────────────────────────────────────────────────────

    /**
     * Create a Zoom meeting for a given user (by email).
     * Returns ['id' => ..., 'join_url' => ..., 'start_url' => ...]
     */
    public function createMeeting(
        string $userEmail,
        string $topic,
        string $startTime,   // ISO8601 e.g. "2026-11-10T09:00:00"
        int $durationMinutes = 60,
        ?string $agenda = null
    ): ?array {
        $token = $this->getAccessToken();
        if (!$token) return null;

        $response = Http::withToken($token)
            ->post("https://api.zoom.us/v2/users/{$userEmail}/meetings", [
                'topic'      => $topic,
                'type'       => 2,                    // Scheduled meeting
                'start_time' => $startTime,
                'duration'   => $durationMinutes,
                'timezone'   => 'Asia/Jakarta',
                'agenda'     => $agenda ?? '',
                'settings'   => [
                    'host_video'        => true,
                    'participant_video'  => true,
                    'join_before_host'  => false,
                    'mute_upon_entry'   => true,
                    'waiting_room'      => true,
                    'auto_recording'    => 'cloud',   // auto record to cloud
                ],
            ]);

        if ($response->failed()) {
            Log::error('[Zoom] createMeeting failed', $response->json());
            return null;
        }

        $data = $response->json();
        return [
            'id'        => (string) ($data['id'] ?? ''),
            'join_url'  => $data['join_url'] ?? null,
            'start_url' => $data['start_url'] ?? null,
        ];
    }

    /**
     * Delete a Zoom meeting.
     */
    public function updateMeeting(string $meetingId, string $topic, string $startTime, ?string $agenda = null): bool
    {
        $token = $this->getAccessToken();
        if (!$token || \Carbon\Carbon::parse($startTime)->isPast()) return false;
        return Http::withToken($token)->patch("https://api.zoom.us/v2/meetings/{$meetingId}", [
            'topic' => $topic, 'start_time' => \Carbon\Carbon::parse($startTime)->utc()->format('Y-m-d\TH:i:s\Z'),
            'timezone' => 'Asia/Jakarta', 'agenda' => $agenda ?? '',
        ])->successful();
    }

    public function deleteMeeting(string $meetingId): bool
    {
        $token = $this->getAccessToken();
        if (!$token) return false;

        $response = Http::withToken($token)
            ->delete("https://api.zoom.us/v2/meetings/{$meetingId}");

        if ($response->failed() && $response->status() !== 404) {
            Log::error('[Zoom] deleteMeeting failed', ['status' => $response->status()]);
            return false;
        }

        return true;
    }

    /**
     * Get meeting recordings.
     */
    public function getMeetingRecordings(string $meetingId): ?array
    {
        $token = $this->getAccessToken();
        if (!$token) return null;

        $response = Http::withToken($token)
            ->get("https://api.zoom.us/v2/meetings/{$meetingId}/recordings");

        if ($response->failed()) return null;

        $data = $response->json();
        $files = $data['recording_files'] ?? [];

        // Return the share URL
        return [
            'share_url'      => $data['share_url'] ?? null,
            'recording_files' => collect($files)->map(fn($f) => [
                'type'       => $f['recording_type'] ?? '',
                'play_url'   => $f['play_url'] ?? null,
                'download_url' => $f['download_url'] ?? null,
            ])->toArray(),
        ];
    }
}

