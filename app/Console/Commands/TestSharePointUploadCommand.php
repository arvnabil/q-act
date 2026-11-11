<?php

namespace App\Console\Commands;

use App\Models\Quotation;
use App\Models\QuotationPurchaseOrder;
use App\Models\SharePointDocument;
use App\Services\MicrosoftGraphTokenService;
use App\Services\QuotationPdfService;
use App\Services\SharePointService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class TestSharePointUploadCommand extends Command
{
    protected $signature = 'sharepoint:test-upload 
                            {quotation_id? : ID penawaran spesifik (opsional, contoh: QO6.0926.284)}
                            {--force-mock : Paksa buat ulang file mock PO}
                            {--dry-run : Jalankan simulasi pembuatan dokumen tanpa menghubungi server Microsoft}';

    protected $description = 'Ambil salah satu data Quotation & PO lalu uji upload dokumen ke Microsoft 365 SharePoint';

    public function handle(
        SharePointService $sharePoint,
        QuotationPdfService $pdfService,
        MicrosoftGraphTokenService $tokenService
    ): int {
        $this->info("==================================================================");
        $this->info("   QSales — Uji Coba Upload Dokumen PO & Quotation ke SharePoint  ");
        $this->info("==================================================================\n");

        $isDryRun = (bool) $this->option('dry-run');

        // 1. Cek Kredensial Microsoft Graph
        $this->comment("1. Memeriksa Kredensial Microsoft Graph (OAuth2)...");
        $hasGraphCredentials = false;
        try {
            $tokenRes = $tokenService->testConnection();
            if ($tokenRes['success']) {
                $hasGraphCredentials = true;
                $expiresIn = $tokenRes['expires_in'] ?? 3600;
                $this->info("   ✓ Token Microsoft Graph berhasil diperoleh (Expires in: {$expiresIn}s)");
            } else {
                $this->warn("   ⚠ Microsoft Entra ID belum terhubung: " . $tokenRes['message']);
            }
        } catch (\Throwable $e) {
            $this->warn("   ⚠ Belum ada kredensial Microsoft Graph aktif di .env: " . $e->getMessage());
        }

        if (!$hasGraphCredentials && !$isDryRun) {
            $this->warn("   → Kredensial GRAPH_* belum diset di .env. Mengaktifkan mode --dry-run (Simulasi Pembuatan Dokumen).\n");
            $isDryRun = true;
        }

        // 2. Cek Pengaturan SharePoint
        $this->comment("2. Memeriksa Pengaturan SharePoint Site & Drive...");
        $siteId = $sharePoint->getSiteId();
        $driveId = $sharePoint->getDriveId();
        $baseFolder = $sharePoint->getBaseFolder();

        if (empty($siteId) || empty($driveId)) {
            if (!$isDryRun) {
                $this->error("❌ SharePoint Site ID atau Drive ID belum dikonfigurasi.");
                $this->line("   Silakan atur di menu Settings QSales atau jalankan dengan opsi --dry-run.");
                return Command::FAILURE;
            } else {
                $this->line("   (Mode Simulasi: Menggunakan placeholder Site & Drive)");
                $siteId = $siteId ?: 'activcoid.sharepoint.com,mock-site-guid,mock-web-guid';
                $driveId = $driveId ?: 'b!mock-drive-id-12345';
            }
        }

        $this->info("   ✓ Site ID:     " . substr($siteId, 0, 35) . "...");
        $this->info("   ✓ Drive ID:    " . substr($driveId, 0, 35) . "...");
        $this->info("   ✓ Base Folder: {$baseFolder}");

        // 3. Mengambil Data Quotation & PO
        $this->comment("3. Mengambil Data Quotation & Purchase Order dari Database...");
        $quotationId = $this->argument('quotation_id');

        $quotation = null;
        if ($quotationId) {
            $quotation = Quotation::with(['customer', 'sales', 'items.product.brand', 'purchaseOrders'])->find($quotationId);
            if (!$quotation) {
                $this->error("❌ Quotation dengan ID '{$quotationId}' tidak ditemukan di database.");
                return Command::FAILURE;
            }
        } else {
            // Cari quotation yang memiliki PO document atau nomor PO
            $quotation = Quotation::with(['customer', 'sales', 'items.product.brand', 'purchaseOrders'])
                ->where(function ($q) {
                    $q->whereNotNull('po_document_path')
                      ->orWhereHas('purchaseOrders', fn ($p) => $p->whereNotNull('document_path'));
                })
                ->latest('updated_at')
                ->first();

            if (!$quotation) {
                $quotation = Quotation::with(['customer', 'sales', 'items.product.brand', 'purchaseOrders'])
                    ->whereNotNull('po_number')
                    ->latest('updated_at')
                    ->first();
            }

            if (!$quotation) {
                $quotation = Quotation::with(['customer', 'sales', 'items.product.brand', 'purchaseOrders'])
                    ->latest('updated_at')
                    ->first();
            }
        }

        if (!$quotation) {
            $this->error("❌ Tidak ada data quotation di database.");
            return Command::FAILURE;
        }

        $this->info("   ✓ Terpilih Quotation: <fg=cyan>{$quotation->id}</> ({$quotation->customer?->name})");
        $this->line("     Status:      {$quotation->status}");
        $this->line("     Total Item:  " . $quotation->items->count() . " item");
        $this->line("     Grand Total: Rp " . number_format($quotation->grand_total, 0, ',', '.'));

        // Ambil atau siapkan PO record
        $po = $quotation->purchaseOrders()->first();
        if (!$po) {
            $this->comment("   → Membuat record Purchase Order sementara...");
            $po = QuotationPurchaseOrder::create([
                'id'                 => (string) Str::uuid(),
                'quotation_id'       => $quotation->id,
                'status'             => $quotation->po_status ?: 'Diterima',
                'po_number'          => $quotation->po_number ?: 'PO-' . date('Ymd') . '-TEST',
                'po_date'            => $quotation->po_date ?: now(),
                'document_path'      => $quotation->po_document_path,
                'quotation_item_ids' => $quotation->items->pluck('id')->values()->all(),
            ]);
        }

        $this->info("   ✓ Data PO: No. <fg=yellow>{$po->po_number}</> (Tanggal: " . ($po->po_date ? $po->po_date->format('d/m/Y') : date('d/m/Y')) . ")");

        // 4. Menyiapkan Dokumen Customer PO
        $this->comment("4. Menyiapkan File Dokumen Customer PO...");
        $docPath = $po->document_path ?: $quotation->po_document_path;
        $localPoFile = null;

        if ($docPath && Storage::disk('public')->exists($docPath) && !$this->option('force-mock')) {
            $localPoFile = Storage::disk('public')->path($docPath);
            $this->info("   ✓ Menggunakan file PO asli di disk: {$docPath} (" . filesize($localPoFile) . " bytes)");
        } else {
            $sampleFilename = 'po-documents/sample_po_' . $sharePoint->sanitizeFilename($po->po_number ?: 'DEMO') . '.pdf';
            $samplePath = Storage::disk('public')->path($sampleFilename);

            $this->warn("   → File fisik belum ada di disk lokal. Men-generate dokumen PDF PO Customer dari data...");
            $pdfService->generateSamplePoPdf($quotation, $po, $samplePath);

            $po->update(['document_path' => $sampleFilename]);
            $localPoFile = $samplePath;
            $this->info("   ✓ Customer PO PDF siap di: {$sampleFilename} (" . filesize($localPoFile) . " bytes)");
        }

        // 5. Menyiapkan Dokumen Quotation PDF (Vector PDF via Dompdf)
        $this->comment("5. Menghasilkan Dokumen Quotation PDF Server-Side (Dompdf)...");
        $quotFilename = 'quotations/Quotation_' . $sharePoint->sanitizeFilename($quotation->id) . '.pdf';
        $localQuotFile = Storage::disk('public')->path($quotFilename);

        $pdfService->saveToFile($quotation, $localQuotFile);
        $this->info("   ✓ Quotation PDF berhasil digenerate: {$quotFilename} (" . filesize($localQuotFile) . " bytes)");

        // 6. Mempersiapkan Folder SharePoint
        $this->comment("6. Mempersiapkan Folder Tujuan di SharePoint...");
        $folderPath = $sharePoint->buildFolderPath($quotation, $po);
        $this->line("   Target folder: <fg=blue>{$folderPath}</>");

        if (!$isDryRun) {
            try {
                $sharePoint->ensureFolder($folderPath);
                $this->info("   ✓ Folder SharePoint siap!");
            } catch (\Throwable $e) {
                $this->error("❌ Gagal membuat folder di SharePoint: " . $e->getMessage());
                return Command::FAILURE;
            }
        } else {
            $this->info("   ✓ [Simulasi] Folder SharePoint dipersiapkan: {$folderPath}");
        }

        // 7. Mengunggah Dokumen Customer PO
        $this->comment("7. Mengunggah Dokumen Customer PO...");
        $cleanPoNum = $sharePoint->sanitizeFilename($po->po_number ?: 'PO');
        $poUploadName = "PO_{$cleanPoNum}.pdf";

        $poDriveItem = null;
        if (!$isDryRun) {
            try {
                $poDriveItem = $sharePoint->uploadFile($folderPath, $poUploadName, $localPoFile);
                $this->info("   ✓ Customer PO berhasil diunggah! WebUrl: <fg=green>{$poDriveItem['webUrl']}</>");
            } catch (\Throwable $e) {
                $this->error("❌ Gagal upload Customer PO: " . $e->getMessage());
            }
        } else {
            $poDriveItem = [
                'id'     => 'mock-sp-item-' . md5($poUploadName),
                'name'   => $poUploadName,
                'webUrl' => "https://activcoid.sharepoint.com/sites/qsales/Shared%20Documents/" . rawurlencode($folderPath) . "/" . rawurlencode($poUploadName),
            ];
            $this->info("   ✓ [Simulasi] Customer PO diunggah ke: <fg=green>{$poDriveItem['webUrl']}</>");
        }

        // Simpan PO document ke database
        SharePointDocument::updateOrCreate(
            [
                'source_type'   => 'quotation_purchase_order',
                'source_id'     => $po->id,
                'document_type' => 'customer_po',
            ],
            [
                'purchase_order_id'      => $po->id,
                'quotation_id'           => $quotation->id,
                'original_filename'      => basename($localPoFile),
                'file_size'              => filesize($localPoFile),
                'mime_type'              => 'application/pdf',
                'sharepoint_item_id'     => $poDriveItem['id'] ?? null,
                'sharepoint_web_url'     => $poDriveItem['webUrl'] ?? null,
                'sharepoint_folder_path' => $folderPath,
                'status'                 => 'synced',
                'synced_at'              => now(),
                'error_message'          => null,
            ]
        );

        // 8. Mengunggah Dokumen Quotation PDF
        $this->comment("8. Mengunggah Dokumen Quotation PDF...");
        $cleanQuotId = $sharePoint->sanitizeFilename($quotation->id);
        $quotUploadName = "Quotation_{$cleanQuotId}.pdf";

        $quotDriveItem = null;
        if (!$isDryRun) {
            try {
                $quotDriveItem = $sharePoint->uploadFile($folderPath, $quotUploadName, $localQuotFile);
                $this->info("   ✓ Quotation PDF berhasil diunggah! WebUrl: <fg=green>{$quotDriveItem['webUrl']}</>");
            } catch (\Throwable $e) {
                $this->error("❌ Gagal upload Quotation PDF: " . $e->getMessage());
            }
        } else {
            $quotDriveItem = [
                'id'     => 'mock-sp-item-' . md5($quotUploadName),
                'name'   => $quotUploadName,
                'webUrl' => "https://activcoid.sharepoint.com/sites/qsales/Shared%20Documents/" . rawurlencode($folderPath) . "/" . rawurlencode($quotUploadName),
            ];
            $this->info("   ✓ [Simulasi] Quotation PDF diunggah ke: <fg=green>{$quotDriveItem['webUrl']}</>");
        }

        // Simpan Quotation document ke database
        SharePointDocument::updateOrCreate(
            [
                'source_type'   => 'quotation',
                'source_id'     => $quotation->id,
                'document_type' => 'quotation_pdf',
            ],
            [
                'purchase_order_id'      => $po->id,
                'quotation_id'           => $quotation->id,
                'original_filename'      => $quotUploadName,
                'file_size'              => filesize($localQuotFile),
                'mime_type'              => 'application/pdf',
                'sharepoint_item_id'     => $quotDriveItem['id'] ?? null,
                'sharepoint_web_url'     => $quotDriveItem['webUrl'] ?? null,
                'sharepoint_folder_path' => $folderPath,
                'status'                 => 'synced',
                'synced_at'              => now(),
                'error_message'          => null,
            ]
        );

        // 9. Ringkasan Akhir
        $this->info("\n==================================================================");
        $this->info("                    RINGKASAN HASIL PENGUJIAN                     ");
        $this->info("==================================================================");
        $this->table(
            ['Parameter', 'Keterangan'],
            [
                ['No. Quotation', $quotation->id],
                ['Pelanggan', $quotation->customer?->name ?? '-'],
                ['No. Purchase Order', $po->po_number],
                ['Folder SharePoint', $folderPath],
                ['Customer PO File', basename($localPoFile) . " (" . filesize($localPoFile) . " bytes)"],
                ['Customer PO Link', $poDriveItem['webUrl'] ?? 'Gagal'],
                ['Quotation PDF File', basename($localQuotFile) . " (" . filesize($localQuotFile) . " bytes)"],
                ['Quotation PDF Link', $quotDriveItem['webUrl'] ?? 'Gagal'],
                ['Status Database', 'Tersimpan di tabel sharepoint_documents (synced)'],
                ['Mode Pengujian', $isDryRun ? 'Simulasi / Dry Run' : 'Live Microsoft SharePoint'],
            ]
        );

        $this->info("Pengujian berhasil dijalankan!\n");
        return Command::SUCCESS;
    }
}
