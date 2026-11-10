<?php

namespace App\Console\Commands;

use App\Models\SystemSetting;
use App\Services\MicrosoftGraphTokenService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Http;

class LookupSharePointSiteCommand extends Command
{
    protected $signature = 'sharepoint:lookup-site 
                            {url=https://activtechno.sharepoint.com/sites/QSalesDocuments : URL SharePoint Site}
                            {--save : Simpan otomatis Site ID dan Drive ID ke Pengaturan Sistem}';

    protected $description = 'Ambil Site ID dan Drive ID dari URL SharePoint menggunakan Microsoft Graph API';

    public function handle(MicrosoftGraphTokenService $tokenService): int
    {
        $url = $this->argument('url');
        $this->info("=================================================");
        $this->info("  Pencarian SharePoint Site & Drive ID");
        $this->info("=================================================");
        $this->line("Target URL: <comment>{$url}</comment>\n");

        // 1. Validasi Token / Kredensial
        try {
            $this->line("1. Mengambil Access Token dari Microsoft Graph API...");
            $token = $tokenService->getAccessToken();
            $this->info("   ✔ Token berhasil didapatkan.\n");
        } catch (\Throwable $e) {
            $this->error("   ✘ Gagal mengambil token Microsoft Graph: " . $e->getMessage());
            $this->warn("\nPastikan variabel berikut sudah terisi di file .env:");
            $this->line("  GRAPH_TENANT_ID=...");
            $this->line("  GRAPH_CLIENT_ID=...");
            $this->line("  GRAPH_CLIENT_SECRET=...\n");
            return 1;
        }

        // 2. Parse URL
        $parsed = parse_url($url);
        $host = $parsed['host'] ?? null;
        $path = $parsed['path'] ?? null;

        if (!$host || !$path) {
            $this->error("Format URL tidak valid. Contoh yang benar: https://activtechno.sharepoint.com/sites/QSalesDocuments");
            return 1;
        }

        $path = '/' . trim($path, '/');

        // 3. Query Site ID
        $this->line("2. Mengambil SharePoint Site ID dari Graph API...");
        $siteEndpoint = "https://graph.microsoft.com/v1.0/sites/{$host}:{$path}";

        $siteResponse = Http::withToken($token)->timeout(20)->get($siteEndpoint);

        if (!$siteResponse->successful()) {
            $this->error("   ✘ Gagal mengambil detail Site: HTTP " . $siteResponse->status());
            $this->line($siteResponse->body());
            $this->warn("\nTips:");
            $this->line("- Pastikan URL benar dan site tersebut memang ada.");
            $this->line("- Pastikan App Registration di Azure sudah diberi API permission: 'Sites.ReadWrite.All' (Application) dan sudah di-Grant admin consent.");
            return 1;
        }

        $siteData = $siteResponse->json();
        $siteId = $siteData['id'] ?? null;
        $siteDisplayName = $siteData['displayName'] ?? 'N/A';

        $this->info("   ✔ Site Ditemukan: <comment>{$siteDisplayName}</comment>");
        $this->info("   ✔ SharePoint Site ID: <fg=green;options=bold>{$siteId}</>\n");

        // 4. Query Drive ID (Libraries)
        $this->line("3. Mengambil Document Libraries (Drives) dari Site...");
        $drivesEndpoint = "https://graph.microsoft.com/v1.0/sites/{$siteId}/drives";

        $drivesResponse = Http::withToken($token)->timeout(20)->get($drivesEndpoint);

        if (!$drivesResponse->successful()) {
            $this->error("   ✘ Gagal mengambil list drives: HTTP " . $drivesResponse->status());
            $this->line($drivesResponse->body());
            return 1;
        }

        $drives = $drivesResponse->json('value') ?? [];
        if (empty($drives)) {
            $this->warn("   ⚠️ Tidak ditemukan Document Library pada site ini.");
            return 0;
        }

        $this->info("   ✔ Ditemukan " . count($drives) . " Document Library:\n");

        $rows = [];
        $selectedDriveId = null;

        foreach ($drives as $drive) {
            $isDefault = in_array(strtolower($drive['name']), ['documents', 'dokumen', 'shared documents']);
            if (!$selectedDriveId || $isDefault) {
                $selectedDriveId = $drive['id'];
            }
            $rows[] = [
                $drive['name'],
                $drive['id'],
                $drive['driveType'] ?? 'documentLibrary',
                $isDefault ? '✔ Rekomendasi' : '',
            ];
        }

        $this->table(['Library Name', 'Drive ID', 'Type', 'Status'], $rows);

        $this->info("\n=================================================");
        $this->info("  NILAI UNTUK DIISIKAN KE FORM PENGATURAN:");
        $this->info("=================================================");
        $this->line("SharePoint Site ID     : <fg=green;options=bold>{$siteId}</>");
        $this->line("SharePoint Drive ID    : <fg=green;options=bold>{$selectedDriveId}</>");
        $this->line("Folder Dasar (default) : <fg=cyan>Documents/Purchase Orders</>");
        $this->info("=================================================\n");

        // 5. Simpan jika opsi --save diberikan
        if ($this->option('save') || $this->confirm('Apakah Anda ingin menyimpan nilai ini langsung ke Pengaturan Sistem?', false)) {
            $setting = SystemSetting::firstOrNew(['key' => 'sharepoint_integration']);
            $current = is_array($setting->value) ? $setting->value : [];
            $current['enabled'] = true;
            $current['site_id'] = $siteId;
            $current['drive_id'] = $selectedDriveId;
            if (empty($current['base_folder'])) {
                $current['base_folder'] = 'Documents/Purchase Orders';
            }
            $setting->value = $current;
            $setting->save();

            $this->info("✔ Berhasil disimpan ke Pengaturan Sistem! Silakan refresh halaman web Settings.");
        }

        return 0;
    }
}
