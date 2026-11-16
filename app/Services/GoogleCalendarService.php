<?php

namespace App\Services;

use App\Models\SystemSetting;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use RuntimeException;

/** Google Calendar integration using one administrator-connected OAuth account. */
class GoogleCalendarService
{
    private const SETTING_KEY = 'google_calendar_oauth';

    private const EVENT_SCOPE = 'https://www.googleapis.com/auth/calendar.events.owned';

    public function credentialsConfigured(): bool
    {
        $config = config('services.google_calendar', []);

        return filled($config['client_id'] ?? null)
            && filled($config['client_secret'] ?? null)
            && filled($config['redirect_uri'] ?? null);
    }

    public function isConfigured(): bool
    {
        return $this->credentialsConfigured() && filled($this->setting()['refresh_token'] ?? null);
    }

    public function connectedAccount(): ?string
    {
        return $this->setting()['account_email'] ?? null;
    }

    public function authorizationUrl(string $state): string
    {
        if (! $this->credentialsConfigured()) {
            throw new RuntimeException('Google Calendar OAuth client belum dikonfigurasi di environment.');
        }

        $config = config('services.google_calendar');

        return 'https://accounts.google.com/o/oauth2/v2/auth?' . http_build_query([
            'client_id' => $config['client_id'],
            'redirect_uri' => $config['redirect_uri'],
            'response_type' => 'code',
            'scope' => 'openid email ' . self::EVENT_SCOPE,
            'access_type' => 'offline',
            'prompt' => 'consent select_account',
            'include_granted_scopes' => 'true',
            'login_hint' => $config['account_email'] ?? '',
            'state' => $state,
        ]);
    }

    public function connectWithAuthorizationCode(string $code): string
    {
        if (! $this->credentialsConfigured()) {
            throw new RuntimeException('Google Calendar OAuth client belum dikonfigurasi di environment.');
        }

        $config = config('services.google_calendar');
        $response = Http::asForm()->timeout(20)->post('https://oauth2.googleapis.com/token', [
            'code' => $code,
            'client_id' => $config['client_id'],
            'client_secret' => $config['client_secret'],
            'redirect_uri' => $config['redirect_uri'],
            'grant_type' => 'authorization_code',
        ]);

        if ($response->failed()) {
            Log::warning('[GoogleCalendar] OAuth code exchange failed.', ['status' => $response->status()]);
            throw new RuntimeException('Google menolak koneksi OAuth. Periksa redirect URI dan konfigurasi OAuth client.');
        }

        $tokens = $response->json();
        $accessToken = $tokens['access_token'] ?? null;
        if (! $accessToken) {
            throw new RuntimeException('Google OAuth tidak mengembalikan access token.');
        }

        $profileResponse = Http::withToken($accessToken)->timeout(15)->get('https://www.googleapis.com/oauth2/v2/userinfo');
        if ($profileResponse->failed() || ! $profileResponse->json('email')) {
            throw new RuntimeException('Email akun Google yang terhubung tidak dapat diverifikasi.');
        }

        $accountEmail = strtolower($profileResponse->json('email'));
        $expectedEmail = strtolower((string) (config('services.google_calendar.account_email') ?? ''));
        if ($expectedEmail !== '' && $accountEmail !== $expectedEmail) {
            throw new RuntimeException("Hubungkan akun Google {$expectedEmail}; akun yang dipilih adalah {$accountEmail}.");
        }

        $existing = $this->setting();
        $refreshToken = $tokens['refresh_token'] ?? null;
        if (! $refreshToken && ! empty($existing['refresh_token'])) {
            $refreshToken = Crypt::decryptString($existing['refresh_token']);
        }
        if (! $refreshToken) {
            throw new RuntimeException('Google tidak mengembalikan refresh token. Putuskan akses aplikasi di akun Google lalu hubungkan kembali.');
        }

        SystemSetting::updateOrCreate(
            ['key' => self::SETTING_KEY],
            ['value' => [
                'account_email' => $accountEmail,
                'refresh_token' => Crypt::encryptString($refreshToken),
                'calendar_id' => config('services.google_calendar.calendar_id', 'primary'),
                'connected_at' => now()->toIso8601String(),
            ]]
        );
        Cache::forget($this->tokenCacheKey());

        return $accountEmail;
    }

    public function disconnect(): void
    {
        SystemSetting::where('key', self::SETTING_KEY)->delete();
        Cache::forget($this->tokenCacheKey());
    }

    public function createEvent(array $payload, ?string $eventId = null): string
    {
        $token = $this->getAccessToken();
        if ($eventId) {
            $payload['id'] = $eventId;
        }

        $response = Http::withToken($token)->timeout(20)
            ->post($this->eventsUrl(['sendUpdates' => 'all']), $payload);

        if ($response->status() === 409 && $eventId) {
            $existing = Http::withToken($token)->timeout(15)->get($this->eventsUrl() . '/' . rawurlencode($eventId));
            if ($existing->successful()) {
                $updated = Http::withToken($token)->timeout(20)
                    ->patch($this->eventsUrl(['sendUpdates' => 'all']) . '/' . rawurlencode($eventId), $payload);
                if ($updated->successful()) {
                    return $eventId;
                }
            }
        }

        if ($response->failed()) {
            Log::warning('[GoogleCalendar] Event creation failed.', ['status' => $response->status(), 'error' => $response->json('error.message')]);
            throw new RuntimeException('Google Calendar gagal membuat undangan. Periksa izin kalender dan alamat peserta.');
        }

        return (string) $response->json('id');
    }

    public function updateEvent(string $eventId, array $payload): bool
    {
        $response = Http::withToken($this->getAccessToken())->timeout(20)
            ->patch($this->eventsUrl(['sendUpdates' => 'all']) . '/' . rawurlencode($eventId), $payload);

        if ($response->failed()) {
            Log::warning('[GoogleCalendar] Event update failed.', ['status' => $response->status(), 'error' => $response->json('error.message')]);
            return false;
        }

        return true;
    }

    public function deleteEvent(string $eventId): bool
    {
        $response = Http::withToken($this->getAccessToken())->timeout(20)
            ->delete($this->eventsUrl(['sendUpdates' => 'all']) . '/' . rawurlencode($eventId));

        if ($response->failed() && ! in_array($response->status(), [404, 410], true)) {
            Log::warning('[GoogleCalendar] Event deletion failed.', ['status' => $response->status()]);
            return false;
        }

        return true;
    }

    private function getAccessToken(): string
    {
        if (! $this->isConfigured()) {
            throw new RuntimeException('Google Calendar belum terhubung melalui OAuth.');
        }

        if (Cache::has($this->tokenCacheKey())) {
            return (string) Cache::get($this->tokenCacheKey());
        }

        $stored = $this->setting();
        $refreshToken = Crypt::decryptString($stored['refresh_token']);
        $config = config('services.google_calendar');
        $response = Http::asForm()->timeout(20)->post('https://oauth2.googleapis.com/token', [
            'client_id' => $config['client_id'],
            'client_secret' => $config['client_secret'],
            'refresh_token' => $refreshToken,
            'grant_type' => 'refresh_token',
        ]);

        if ($response->failed() || ! $response->json('access_token')) {
            Log::warning('[GoogleCalendar] OAuth token refresh failed.', ['status' => $response->status()]);
            throw new RuntimeException('Token Google Calendar kedaluwarsa atau dicabut. Admin perlu menghubungkan ulang akun Google.');
        }

        $accessToken = (string) $response->json('access_token');
        Cache::put($this->tokenCacheKey(), $accessToken, max(60, (int) $response->json('expires_in', 3600) - 120));

        if ($response->json('refresh_token')) {
            $stored['refresh_token'] = Crypt::encryptString($response->json('refresh_token'));
            SystemSetting::updateOrCreate(['key' => self::SETTING_KEY], ['value' => $stored]);
        }

        return $accessToken;
    }

    private function setting(): array
    {
        $value = SystemSetting::find(self::SETTING_KEY)?->value;

        return is_array($value) ? $value : [];
    }

    private function eventsUrl(array $query = []): string
    {
        $calendarId = (string) config('services.google_calendar.calendar_id', 'primary');
        $url = 'https://www.googleapis.com/calendar/v3/calendars/' . rawurlencode($calendarId) . '/events';

        return $query ? $url . '?' . http_build_query($query) : $url;
    }

    private function tokenCacheKey(): string
    {
        return 'google_calendar_access_token_' . sha1((string) config('services.google_calendar.client_id'));
    }

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

        $body = [
            'summary' => $summary,
            'description' => $description,
        ];

        if ($isAllDay) {
            $body['start'] = ['date' => substr($startDatetime, 0, 10)];
            $body['end'] = ['date' => substr($endDatetime, 0, 10)];
        } else {
            $body['start'] = ['dateTime' => $startDatetime, 'timeZone' => 'Asia/Jakarta'];
            $body['end'] = ['dateTime' => $endDatetime, 'timeZone' => 'Asia/Jakarta'];
        }

        if ($location) {
            $body['location'] = $location;
        }
        if ($attendees) {
            $body['attendees'] = array_values(array_map(fn ($email) => ['email' => $email], $attendees));
        }

        return $body;
    }
}
