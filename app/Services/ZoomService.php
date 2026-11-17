<?php

namespace App\Services;

use App\Models\SystemSetting;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use RuntimeException;

/**
 * Zoom Server-to-Server OAuth Service
 *
 * Credentials stored in SystemSetting key: 'zoom_credentials'
 * Value shape: { "account_id":"...", "client_id":"...", "client_secret":"..." }
 *
 * Meeting scopes: meeting:write:admin, meeting:read:admin.
 * Sub-account detail scopes: account:read:sub_account:master,
 * billing:read:plan_information:master, billing:read:plan_usage:master,
 * billing:read:billing_information:master.
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

    /**
     * Read every page of the Zoom master account's sub-account list.
     * This is a read-only Master Account API call; it does not create or update accounts.
     *
     * @return array{accounts: array<int, array<string, mixed>>, pages: int}
     */
    public function listAllSubAccounts(): array
    {
        if (! $this->isConfigured()) {
            throw new RuntimeException('Integrasi Zoom Server-to-Server belum dikonfigurasi.');
        }

        $token = $this->getAccessToken();
        if (! $token) {
            throw new RuntimeException('Zoom tidak memberikan access token untuk sinkronisasi.');
        }

        $accounts = [];
        $nextPageToken = null;
        $seenPageTokens = [];
        $pages = 0;

        do {
            $query = ['page_size' => 30];
            if ($nextPageToken) {
                if (isset($seenPageTokens[$nextPageToken])) {
                    throw new RuntimeException('Zoom mengembalikan token halaman yang berulang.');
                }
                $seenPageTokens[$nextPageToken] = true;
                $query['next_page_token'] = $nextPageToken;
            }

            $response = Http::withToken($token)
                ->timeout(30)
                ->get('https://api.zoom.us/v2/accounts', $query);

            if ($response->failed()) {
                $zoomCode = $response->json('code');
                $codeSuffix = $zoomCode ? " (kode Zoom {$zoomCode})" : '';
                throw new RuntimeException("Gagal membaca daftar sub-account Zoom: HTTP {$response->status()}{$codeSuffix}.");
            }

            $pageAccounts = $response->json('accounts');
            if (! is_array($pageAccounts)) {
                throw new RuntimeException('Respons daftar sub-account Zoom tidak memiliki daftar akun yang valid.');
            }

            $accounts = array_merge($accounts, $pageAccounts);
            $pages++;
            $nextPageToken = $response->json('next_page_token') ?: null;
        } while ($nextPageToken);

        return ['accounts' => $accounts, 'pages' => $pages];
    }

    /** Read one sub-account detail endpoint without exposing Zoom response errors or credentials. */
    public function readSubAccount(string $accountId, string $endpoint): array
    {
        $allowedEndpoints = ['account', 'plans', 'usage', 'billing'];
        if (! in_array($endpoint, $allowedEndpoints, true)) {
            return ['available' => false, 'data' => null, 'message' => 'Endpoint Zoom tidak dikenal.'];
        }

        if (! $this->isConfigured()) {
            return ['available' => false, 'data' => null, 'message' => 'Integrasi Zoom belum dikonfigurasi.'];
        }

        try {
            $token = $this->getAccessToken();
        } catch (\Throwable $exception) {
            Log::warning('[Zoom] Sub-account token request failed', [
                'endpoint' => $endpoint,
                'exception' => get_class($exception),
            ]);

            return ['available' => false, 'data' => null, 'message' => 'Token Zoom tidak dapat diperoleh. Periksa koneksi dan konfigurasi Server-to-Server.'];
        }
        if (! $token) {
            return ['available' => false, 'data' => null, 'message' => 'Token Zoom tidak tersedia. Periksa konfigurasi Server-to-Server.'];
        }

        $path = match ($endpoint) {
            'account' => "accounts/{$accountId}",
            'plans' => "accounts/{$accountId}/billing/information",
            'usage' => "accounts/{$accountId}/billing/usage",
            'billing' => "accounts/{$accountId}/billing",
        };

        try {
            $response = Http::withToken($token)->timeout(20)->get("https://api.zoom.us/v2/{$path}");
        } catch (\Throwable $exception) {
            Log::warning('[Zoom] Sub-account detail request failed', [
                'endpoint' => $endpoint,
                'exception' => get_class($exception),
            ]);

            return ['available' => false, 'data' => null, 'message' => 'Zoom tidak dapat dijangkau saat ini.'];
        }

        if ($response->failed()) {
            $message = match ($response->status()) {
                401, 403 => 'Zoom menolak akses. Periksa scope API dan persetujuan admin untuk detail akun ini.',
                404 => 'Data detail tidak ditemukan di Zoom.',
                429 => 'Batas permintaan Zoom tercapai. Coba lagi beberapa saat.',
                default => 'Zoom gagal mengirim detail akun (HTTP '.$response->status().').',
            };
            Log::warning('[Zoom] Sub-account detail request returned an error', [
                'endpoint' => $endpoint,
                'status' => $response->status(),
                'zoom_code' => $response->json('code'),
            ]);

            return ['available' => false, 'data' => null, 'message' => $message];
        }

        return ['available' => true, 'data' => $response->json(), 'message' => null];
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

