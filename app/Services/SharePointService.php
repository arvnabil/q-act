<?php

namespace App\Services;

use App\Models\Quotation;
use App\Models\QuotationPurchaseOrder;
use App\Models\SystemSetting;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class SharePointService
{
    protected MicrosoftGraphTokenService $tokenService;
    protected array $settings = [];

    public function __construct(?MicrosoftGraphTokenService $tokenService = null)
    {
        $this->tokenService = $tokenService ?: new MicrosoftGraphTokenService();
        $this->loadSettings();
    }

    public function loadSettings(): void
    {
        $spSetting = SystemSetting::find('sharepoint_integration');
        $this->settings = $spSetting ? (array) $spSetting->value : [];
    }

    public function isEnabled(): bool
    {
        return !empty($this->settings['enabled']);
    }

    public function isConfigured(): bool
    {
        return $this->isEnabled()
            && !empty($this->getSiteId())
            && !empty($this->getDriveId());
    }

    public function getSiteId(): ?string
    {
        return $this->settings['site_id'] ?? null;
    }

    public function getDriveId(): ?string
    {
        return $this->settings['drive_id'] ?? null;
    }

    public function getBaseFolder(): string
    {
        $folder = trim($this->settings['base_folder'] ?? 'Documents/Purchase Orders', '/');
        return $folder ?: 'Documents/Purchase Orders';
    }

    public function sanitizeFilename(string $name): string
    {
        // SharePoint forbidden chars: " * : < > ? / \ |
        $cleaned = preg_replace('/["\*:<>?\/\\\\|]/', '-', $name);
        return trim($cleaned, ' .');
    }

    public function sanitizePath(string $path): string
    {
        $parts = array_filter(explode('/', str_replace('\\', '/', $path)), fn ($p) => $p !== '' && $p !== '.');
        $sanitized = array_map(fn ($p) => $this->sanitizeFilename($p), $parts);
        return implode('/', $sanitized);
    }

    /**
     * Build folder path: {base_folder}/{YEAR}/{QUOTATION_ID}_{PO_NUMBER}_{PO_ID_SUFFIX}
     */
    public function buildFolderPath(Quotation $quotation, QuotationPurchaseOrder $po): string
    {
        $base = $this->getBaseFolder();
        $year = $po->po_date ? $po->po_date->format('Y') : date('Y');
        $sanitizedPoNum = $this->sanitizeFilename($po->po_number ?: 'PO');
        $quotId = $this->sanitizeFilename($quotation->id);
        $shortId = substr(str_replace('-', '', $po->id), 0, 8);
        $folderName = "{$quotId}_{$sanitizedPoNum}_{$shortId}";

        return "{$base}/{$year}/{$folderName}";
    }

    protected function client()
    {
        return Http::withHeaders($this->tokenService->getAuthorizedHeaders())
            ->timeout(60);
    }

    /**
     * Ensure a folder hierarchy exists in the SharePoint drive.
     */
    public function ensureFolder(string $folderPath): array
    {
        $siteId = $this->getSiteId();
        $driveId = $this->getDriveId();
        $cleanPath = $this->sanitizePath($folderPath);

        if (!$siteId || !$driveId) {
            throw new \RuntimeException('SharePoint Site ID or Drive ID is not configured.');
        }

        // Try getting the folder first
        $encodedPath = implode('/', array_map('rawurlencode', explode('/', $cleanPath)));
        $checkUrl = "https://graph.microsoft.com/v1.0/sites/{$siteId}/drives/{$driveId}/root:/{$encodedPath}";
        $checkRes = $this->client()->get($checkUrl);

        if ($checkRes->successful()) {
            return $checkRes->json();
        }

        // Folder doesn't exist, create each segment iteratively from root
        $segments = explode('/', $cleanPath);
        $currentParentPath = '';

        $lastItem = null;
        foreach ($segments as $segment) {
            $parentPathSegment = $currentParentPath !== '' ? ":/{$currentParentPath}:" : '';
            $createUrl = "https://graph.microsoft.com/v1.0/sites/{$siteId}/drives/{$driveId}/root{$parentPathSegment}/children";

            $res = $this->client()->post($createUrl, [
                'name'                              => $segment,
                'folder'                            => new \stdClass(),
                '@microsoft.graph.conflictBehavior' => 'fail',
            ]);

            if ($res->status() === 409) {
                // Already exists, fetch it
                $fetchPath = $currentParentPath ? "{$currentParentPath}/{$segment}" : $segment;
                $encFetch = implode('/', array_map('rawurlencode', explode('/', $fetchPath)));
                $getRes = $this->client()->get("https://graph.microsoft.com/v1.0/sites/{$siteId}/drives/{$driveId}/root:/{$encFetch}");
                $lastItem = $getRes->json();
            } elseif ($res->successful()) {
                $lastItem = $res->json();
            } else {
                throw new \RuntimeException("Failed to create SharePoint folder segment '{$segment}': " . $res->body());
            }

            $currentParentPath = $currentParentPath ? "{$currentParentPath}/{$segment}" : $segment;
        }

        return $lastItem ?? [];
    }

    /**
     * Upload small file (<= 4MB) via simple PUT
     */
    public function uploadSmallFile(string $folderPath, string $filename, string $localFilePath): array
    {
        $siteId = $this->getSiteId();
        $driveId = $this->getDriveId();
        $cleanFolder = $this->sanitizePath($folderPath);
        $cleanName = $this->sanitizeFilename($filename);

        $fullPath = "{$cleanFolder}/{$cleanName}";
        $encodedPath = implode('/', array_map('rawurlencode', explode('/', $fullPath)));
        $url = "https://graph.microsoft.com/v1.0/sites/{$siteId}/drives/{$driveId}/root:/{$encodedPath}:/content";

        $mime = mime_content_type($localFilePath) ?: 'application/octet-stream';
        $contents = file_get_contents($localFilePath);

        $response = Http::withHeaders(array_merge($this->tokenService->getAuthorizedHeaders(), [
            'Content-Type' => $mime,
        ]))
            ->withBody($contents, $mime)
            ->timeout(120)
            ->put($url);

        if (!$response->successful()) {
            throw new \RuntimeException("SharePoint upload failed (HTTP {$response->status()}): " . $response->body());
        }

        return $response->json();
    }

    /**
     * Upload large file (> 4MB) via UploadSession (3.2MB chunks)
     */
    public function uploadLargeFile(string $folderPath, string $filename, string $localFilePath): array
    {
        $siteId = $this->getSiteId();
        $driveId = $this->getDriveId();
        $cleanFolder = $this->sanitizePath($folderPath);
        $cleanName = $this->sanitizeFilename($filename);

        $fullPath = "{$cleanFolder}/{$cleanName}";
        $encodedPath = implode('/', array_map('rawurlencode', explode('/', $fullPath)));
        $sessionUrl = "https://graph.microsoft.com/v1.0/sites/{$siteId}/drives/{$driveId}/root:/{$encodedPath}:/createUploadSession";

        $sessionRes = $this->client()->post($sessionUrl, [
            'item' => [
                '@microsoft.graph.conflictBehavior' => 'replace',
                'name'                              => $cleanName,
            ],
        ]);

        if (!$sessionRes->successful()) {
            throw new \RuntimeException("Failed to create SharePoint upload session: " . $sessionRes->body());
        }

        $uploadUrl = $sessionRes->json('uploadUrl');
        $fileSize = filesize($localFilePath);
        $handle = fopen($localFilePath, 'rb');
        $chunkSize = 320 * 1024 * 10; // 3.2 MB (multiple of 320 KiB)

        $driveItem = null;
        try {
            $offset = 0;
            while (!feof($handle) && $offset < $fileSize) {
                $chunk = fread($handle, $chunkSize);
                $chunkLen = strlen($chunk);
                $end = $offset + $chunkLen - 1;

                $putRes = Http::withHeaders([
                    'Content-Length' => $chunkLen,
                    'Content-Range'  => "bytes {$offset}-{$end}/{$fileSize}",
                ])
                    ->withBody($chunk, 'application/octet-stream')
                    ->timeout(120)
                    ->put($uploadUrl);

                if (!$putRes->successful()) {
                    throw new \RuntimeException("Chunk upload failed at bytes {$offset}-{$end}: " . $putRes->body());
                }

                $offset += $chunkLen;
                if ($offset >= $fileSize) {
                    $driveItem = $putRes->json();
                }
            }
        } finally {
            fclose($handle);
        }

        return $driveItem ?: [];
    }

    /**
     * Upload file (automatically chooses small or large upload)
     */
    public function uploadFile(string $folderPath, string $filename, string $localFilePath): array
    {
        if (!file_exists($localFilePath)) {
            throw new \RuntimeException("Local file does not exist: {$localFilePath}");
        }

        $size = filesize($localFilePath);
        if ($size > 4 * 1024 * 1024) {
            return $this->uploadLargeFile($folderPath, $filename, $localFilePath);
        }

        return $this->uploadSmallFile($folderPath, $filename, $localFilePath);
    }

    /**
     * Create an organization or specific sharing link for a DriveItem.
     */
    public function createSharingLink(string $itemId, string $type = 'view', string $scope = 'organization'): array
    {
        $siteId = $this->getSiteId();
        $driveId = $this->getDriveId();
        $url = "https://graph.microsoft.com/v1.0/sites/{$siteId}/drives/{$driveId}/items/{$itemId}/createLink";

        $res = $this->client()->post($url, [
            'type'  => $type,
            'scope' => $scope,
        ]);

        if (!$res->successful()) {
            Log::warning('SharePoint createSharingLink warning', ['status' => $res->status(), 'body' => $res->body()]);
            return [];
        }

        return $res->json();
    }

    /**
     * Grant read/write permissions directly to users by email.
     */
    public function grantPermission(string $itemId, array $emails, array $roles = ['read']): array
    {
        $emails = array_values(array_filter(array_unique($emails)));
        if (empty($emails)) {
            return [];
        }

        $siteId = $this->getSiteId();
        $driveId = $this->getDriveId();
        $url = "https://graph.microsoft.com/v1.0/sites/{$siteId}/drives/{$driveId}/items/{$itemId}/invite";

        $recipients = array_map(fn ($email) => ['email' => $email], $emails);

        $res = $this->client()->post($url, [
            'recipients'     => $recipients,
            'roles'          => $roles,
            'requireSignIn'  => true,
            'sendInvitation' => false,
        ]);

        if (!$res->successful()) {
            Log::warning('SharePoint grantPermission warning', ['status' => $res->status(), 'body' => $res->body()]);
            return [];
        }

        return $res->json();
    }

    /**
     * Test connection to Microsoft Graph & SharePoint site/drive.
     */
    public function testConnection(): array
    {
        try {
            $tokenRes = $this->tokenService->testConnection();
            if (!$tokenRes['success']) {
                return $tokenRes;
            }

            $siteId = $this->getSiteId();
            $driveId = $this->getDriveId();

            if (empty($siteId)) {
                return [
                    'success'     => false,
                    'message'     => 'Microsoft Graph token OK, tetapi SharePoint Site ID belum dikonfigurasi.',
                    'diagnostics' => $tokenRes,
                ];
            }

            // Test Site access
            $siteRes = $this->client()->get("https://graph.microsoft.com/v1.0/sites/{$siteId}");
            if (!$siteRes->successful()) {
                return [
                    'success'     => false,
                    'message'     => "Gagal mengakses SharePoint Site (HTTP {$siteRes->status()}): " . ($siteRes->json('error.message') ?: $siteRes->body()),
                    'diagnostics' => ['site_status' => $siteRes->status(), 'response' => $siteRes->json()],
                ];
            }
            $siteData = $siteRes->json();

            // Test Drive access if driveId is provided
            $driveData = null;
            if (!empty($driveId)) {
                $driveRes = $this->client()->get("https://graph.microsoft.com/v1.0/sites/{$siteId}/drives/{$driveId}");
                if (!$driveRes->successful()) {
                    return [
                        'success'     => false,
                        'message'     => "Gagal mengakses SharePoint Drive (HTTP {$driveRes->status()}): " . ($driveRes->json('error.message') ?: $driveRes->body()),
                        'diagnostics' => ['drive_status' => $driveRes->status(), 'response' => $driveRes->json()],
                    ];
                }
                $driveData = $driveRes->json();
            }

            return [
                'success'     => true,
                'message'     => 'Koneksi ke Microsoft Graph & SharePoint berhasil!',
                'site_name'   => $siteData['displayName'] ?? $siteData['name'] ?? 'Site Connected',
                'site_url'    => $siteData['webUrl'] ?? null,
                'drive_name'  => $driveData['name'] ?? null,
                'drive_type'  => $driveData['driveType'] ?? null,
            ];
        } catch (\Throwable $e) {
            return [
                'success' => false,
                'message' => 'Exception: ' . $e->getMessage(),
            ];
        }
    }

    /**
     * Test uploading and deleting a test file in SharePoint.
     */
    public function testUpload(): array
    {
        try {
            $folder = $this->getBaseFolder() . '/_healthcheck';
            $filename = 'healthcheck_' . time() . '.txt';
            $tempPath = tempnam(sys_get_temp_dir(), 'sp_test_');
            file_put_contents($tempPath, "QSales SharePoint Health Check at " . date('Y-m-d H:i:s'));

            $this->ensureFolder($folder);
            $driveItem = $this->uploadSmallFile($folder, $filename, $tempPath);
            @unlink($tempPath);

            $itemId = $driveItem['id'] ?? null;
            if ($itemId) {
                // Delete test item
                $siteId = $this->getSiteId();
                $driveId = $this->getDriveId();
                $this->client()->delete("https://graph.microsoft.com/v1.0/sites/{$siteId}/drives/{$driveId}/items/{$itemId}");
            }

            return [
                'success' => true,
                'message' => "Test upload & cleanup berhasil! File ID: {$itemId}",
                'item'    => $driveItem,
            ];
        } catch (\Throwable $e) {
            return [
                'success' => false,
                'message' => 'Test upload gagal: ' . $e->getMessage(),
            ];
        }
    }
}
