<?php

namespace App\Services;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class MicrosoftGraphTokenService
{
    protected ?string $tenantId;
    protected ?string $clientId;
    protected ?string $clientSecret;

    public function __construct(
        ?string $tenantId = null,
        ?string $clientId = null,
        ?string $clientSecret = null
    ) {
        $graphConfig = config('mail.mailers.microsoft-graph', []);
        $this->tenantId = $tenantId ?: ($graphConfig['tenant_id'] ?? env('GRAPH_TENANT_ID'));
        $this->clientId = $clientId ?: ($graphConfig['client_id'] ?? env('GRAPH_CLIENT_ID'));
        $this->clientSecret = $clientSecret ?: ($graphConfig['client_secret'] ?? env('GRAPH_CLIENT_SECRET'));
    }

    /**
     * Get OAuth2 access token with TTL caching (default 55 minutes).
     */
    public function getAccessToken(bool $forceRefresh = false): string
    {
        if (empty($this->tenantId) || empty($this->clientId) || empty($this->clientSecret)) {
            throw new \RuntimeException('Microsoft Graph credentials are not configured. Please set GRAPH_TENANT_ID, GRAPH_CLIENT_ID, and GRAPH_CLIENT_SECRET.');
        }

        $cacheKey = 'ms_graph_token_' . md5($this->clientId . $this->tenantId);

        if (! $forceRefresh && Cache::has($cacheKey)) {
            return Cache::get($cacheKey);
        }

        $url = "https://login.microsoftonline.com/{$this->tenantId}/oauth2/v2.0/token";

        $response = Http::asForm()->timeout(15)->post($url, [
            'grant_type'    => 'client_credentials',
            'client_id'     => $this->clientId,
            'client_secret' => $this->clientSecret,
            'scope'         => 'https://graph.microsoft.com/.default',
        ]);

        if (! $response->successful()) {
            $error = $response->json('error_description') ?: $response->body();
            Log::error('Microsoft Graph token request failed', [
                'status' => $response->status(),
                'error'  => $error,
            ]);
            throw new \RuntimeException("Failed to get Microsoft Graph token (HTTP {$response->status()}): {$error}");
        }

        $data = $response->json();
        $token = $data['access_token'] ?? null;
        $expiresIn = (int) ($data['expires_in'] ?? 3600);

        if (! $token) {
            throw new \RuntimeException('No access_token present in Microsoft Entra token response.');
        }

        // Cache for (expiresIn - 300) seconds (e.g., 55 minutes) to ensure freshness
        $cacheTtl = max(60, $expiresIn - 300);
        Cache::put($cacheKey, $token, $cacheTtl);

        return $token;
    }

    /**
     * Get pre-built Authorization headers for Graph API HTTP calls.
     */
    public function getAuthorizedHeaders(bool $forceRefresh = false): array
    {
        return [
            'Authorization' => 'Bearer ' . $this->getAccessToken($forceRefresh),
            'Accept'        => 'application/json',
        ];
    }

    /**
     * Invalidate cached token.
     */
    public function clearToken(): void
    {
        $cacheKey = 'ms_graph_token_' . md5($this->clientId . $this->tenantId);
        Cache::forget($cacheKey);
    }

    /**
     * Test token acquisition and return diagnostics.
     */
    public function testConnection(): array
    {
        try {
            $token = $this->getAccessToken(true);
            return [
                'success' => true,
                'message' => 'Koneksi Microsoft Graph & autentikasi token berhasil.',
                'token_preview' => substr($token, 0, 15) . '...',
            ];
        } catch (\Throwable $e) {
            return [
                'success' => false,
                'message' => $e->getMessage(),
            ];
        }
    }
}
