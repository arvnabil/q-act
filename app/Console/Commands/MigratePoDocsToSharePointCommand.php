<?php

namespace App\Console\Commands;

use App\Models\Quotation;
use App\Models\QuotationPurchaseOrder;
use App\Models\SalesOrder;
use App\Models\SharePointDocument;
use App\Services\QuotationPdfService;
use App\Services\SharePointService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class MigratePoDocsToSharePointCommand extends Command
{
    protected $signature = 'sharepoint:migrate-existing-po-docs
                            {--dry-run : Simulasi tanpa upload/delete sungguhan}
                            {--delete-local : Hapus file lokal setelah berhasil upload ke SharePoint}
                            {--limit= : Batas jumlah PO yang diproses (opsional)}';

    protected $description = 'Migrasi dokumen PO yang sudah ada di storage lokal ke SharePoint';

    public function handle(SharePointService $sharePoint, QuotationPdfService $pdfService): int
    {
        $isDryRun     = $this->option('dry-run');
        $deleteLocal  = $this->option('delete-local');
        $limit        = $this->option('limit') ? (int) $this->option('limit') : null;

        $this->info('');
        $this->info('=================================================');
        $this->info('  Migrasi Dokumen PO Lokal → SharePoint');
        $this->info('=================================================');
        if ($isDryRun) {
            $this->warn('  MODE DRY-RUN: Tidak ada file yang akan diupload atau dihapus.');
        }
        $this->info('');

        // Verify SharePoint is configured
        if (!$sharePoint->isConfigured()) {
            $this->error('SharePoint belum dikonfigurasi. Pastikan pengaturan SharePoint sudah lengkap di Settings.');
            return self::FAILURE;
        }

        // 1. Sync legacy Quotations that have po_document_path into QuotationPurchaseOrder records
        $legacyQuotations = Quotation::query()
            ->whereNotNull('po_document_path')
            ->where('po_document_path', '!=', '')
            ->get();

        foreach ($legacyQuotations as $legacyQ) {
            $existingPo = QuotationPurchaseOrder::where('quotation_id', $legacyQ->id)->first();
            if (!$existingPo) {
                QuotationPurchaseOrder::create([
                    'id'            => (string) Str::uuid(),
                    'quotation_id'  => $legacyQ->id,
                    'status'        => $legacyQ->po_status ?: 'Diterima',
                    'po_number'     => $legacyQ->po_number ?: 'PO-' . $legacyQ->id,
                    'po_date'       => $legacyQ->po_date ?: now(),
                    'document_path' => $legacyQ->po_document_path,
                    'created_by'    => $legacyQ->sales_id,
                ]);
            } elseif (empty($existingPo->document_path)) {
                $existingPo->updateQuietly(['document_path' => $legacyQ->po_document_path]);
            }
        }

        // 2. Query all POs with a local document path
        $query = QuotationPurchaseOrder::query()
            ->whereNotNull('document_path')
            ->where('document_path', '!=', '')
            ->with(['quotation.customer', 'quotation.sales', 'sharePointDocuments'])
            ->orderBy('created_at', 'asc');

        if ($limit) {
            $query->limit($limit);
        }

        $pos = $query->get();

        if ($pos->isEmpty()) {
            $this->info('Tidak ada dokumen PO lokal yang ditemukan. Selesai.');
            return self::SUCCESS;
        }

        $this->info("Ditemukan {$pos->count()} dokumen PO lokal.");
        $this->info('');

        $countSkipped  = 0;
        $countSuccess  = 0;
        $countFailed   = 0;
        $countDeleted  = 0;

        $bar = $this->output->createProgressBar($pos->count());
        $bar->start();

        foreach ($pos as $po) {
            $bar->advance();
            $quotation = $po->quotation;

            if (!$quotation) {
                $this->newLine();
                $this->warn("  [SKIP] PO {$po->id}: Quotation tidak ditemukan.");
                $countSkipped++;
                continue;
            }

            // Check if already synced
            $existingSync = $po->sharePointDocuments
                ->where('document_type', 'customer_po')
                ->where('status', 'synced')
                ->first();

            if ($existingSync && !empty($existingSync->sharepoint_web_url)) {
                // Already synced — optionally delete local file if flag set
                if ($deleteLocal && !$isDryRun && $po->document_path) {
                    $this->deleteLocalFile($po, $quotation, $countDeleted);
                }
                $countSkipped++;
                continue;
            }

            $docPath = $po->document_path;

            // Verify file exists
            $disk = Storage::disk('public')->exists($docPath) ? Storage::disk('public') : null;
            if (!$disk || !$disk->exists($docPath)) {
                $this->newLine();
                $this->warn("  [SKIP] PO {$po->po_number} ({$po->id}): File tidak ada di storage ({$docPath}).");
                $countSkipped++;
                continue;
            }

            $localFilePath = $disk->path($docPath);

            if ($isDryRun) {
                $this->newLine();
                $salesName = optional($quotation->sales)->name ?? 'Unknown';
                $this->line("  [DRY-RUN] Akan upload PO {$po->po_number} ({$quotation->id}) — Sales: {$salesName}");
                $countSuccess++;
                continue;
            }

            try {
                // Build folder and upload PO document
                $folderPath = $sharePoint->buildFolderPath($quotation, $po);
                $sharePoint->ensureFolder($folderPath);

                $ext = pathinfo($docPath, PATHINFO_EXTENSION);
                $cleanPoNum = $sharePoint->sanitizeFilename($po->po_number ?: 'PO');
                $uploadFilename = "PO_{$cleanPoNum}" . ($ext ? ".{$ext}" : '');

                $driveItem = $sharePoint->uploadFile($folderPath, $uploadFilename, $localFilePath);
                $itemId    = $driveItem['id'] ?? null;
                $webUrl    = $driveItem['webUrl'] ?? null;

                // Try to create sharing link
                if ($itemId) {
                    try {
                        $sharingLink = $sharePoint->createSharingLink($itemId, 'view', 'organization');
                        if (!empty($sharingLink['link']['webUrl'])) {
                            $webUrl = $sharingLink['link']['webUrl'];
                        }
                    } catch (\Throwable $e) {
                        Log::debug('migrate-po-docs: createSharingLink fallback: ' . $e->getMessage());
                    }
                }

                // Upsert SharePointDocument record
                SharePointDocument::updateOrCreate(
                    [
                        'source_type'   => 'quotation_purchase_order',
                        'source_id'     => $po->id,
                        'document_type' => 'customer_po',
                    ],
                    [
                        'purchase_order_id'      => $po->id,
                        'quotation_id'           => $quotation->id,
                        'original_filename'      => basename($docPath),
                        'file_size'              => $disk->size($docPath),
                        'mime_type'              => mime_content_type($localFilePath) ?: 'application/octet-stream',
                        'sharepoint_item_id'     => $itemId,
                        'sharepoint_web_url'     => $webUrl,
                        'sharepoint_folder_path' => $folderPath,
                        'status'                 => 'synced',
                        'synced_at'              => now(),
                        'error_message'          => null,
                    ]
                );

                // Also upload the Quotation PDF to same folder
                try {
                    $cleanQuotId    = $sharePoint->sanitizeFilename($quotation->id);
                    $quotUploadName = "Quotation_{$cleanQuotId}.pdf";
                    $quotDiskPath   = 'quotations/Quotation_' . $cleanQuotId . '.pdf';
                    $localQuotFile  = Storage::disk('public')->path($quotDiskPath);

                    $pdfService->saveToFile($quotation, $localQuotFile);

                    if (file_exists($localQuotFile)) {
                        $quotDriveItem = $sharePoint->uploadFile($folderPath, $quotUploadName, $localQuotFile);
                        $quotItemId    = $quotDriveItem['id'] ?? null;
                        $quotWebUrl    = $quotDriveItem['webUrl'] ?? null;

                        if ($quotItemId) {
                            try {
                                $sl = $sharePoint->createSharingLink($quotItemId, 'view', 'organization');
                                if (!empty($sl['link']['webUrl'])) {
                                    $quotWebUrl = $sl['link']['webUrl'];
                                }
                            } catch (\Throwable $e) {
                                Log::debug('migrate-po-docs: quotation createSharingLink fallback: ' . $e->getMessage());
                            }
                        }

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
                                'sharepoint_item_id'     => $quotItemId,
                                'sharepoint_web_url'     => $quotWebUrl,
                                'sharepoint_folder_path' => $folderPath,
                                'status'                 => 'synced',
                                'synced_at'              => now(),
                                'error_message'          => null,
                            ]
                        );
                    }
                } catch (\Throwable $e) {
                    // Non-fatal: quotation PDF upload failure should not stop PO migration
                    Log::warning("migrate-po-docs: Gagal upload Quotation PDF untuk {$quotation->id}: " . $e->getMessage());
                }

                // Delete local file if requested
                if ($deleteLocal) {
                    $this->deleteLocalFile($po, $quotation, $countDeleted);
                }

                $countSuccess++;
                Log::info("migrate-po-docs: Berhasil upload PO {$po->po_number} ({$po->id}) ke SharePoint.");

            } catch (\Throwable $e) {
                $this->newLine();
                $this->error("  [ERROR] PO {$po->po_number} ({$po->id}): " . $e->getMessage());
                Log::error("migrate-po-docs: Gagal upload PO {$po->id}: " . $e->getMessage());
                $countFailed++;
            }
        }

        $bar->finish();
        $this->newLine(2);

        $this->info('=================================================');
        $this->info('  Hasil Migrasi');
        $this->info('=================================================');
        $this->info("  ✔ Berhasil diupload : {$countSuccess}");
        $this->warn("  ⟳ Dilewati (skip)   : {$countSkipped}");
        if ($deleteLocal) {
            $this->info("  🗑 File lokal dihapus: {$countDeleted}");
        }
        if ($countFailed > 0) {
            $this->error("  ✘ Gagal              : {$countFailed}");
        }
        $this->info('=================================================');
        $this->info('');

        return $countFailed > 0 ? self::FAILURE : self::SUCCESS;
    }

    private function deleteLocalFile(QuotationPurchaseOrder $po, Quotation $quotation, int &$countDeleted): void
    {
        $docPath = $po->document_path ?: $quotation->po_document_path;
        if (!$docPath) {
            return;
        }

        try {
            if (Storage::disk('public')->exists($docPath)) {
                Storage::disk('public')->delete($docPath);
            }
            // Clear document_path on PO record
            $po->updateQuietly(['document_path' => null]);

            // Also clear on quotation if it matches
            if ($quotation->po_document_path === $docPath) {
                $quotation->updateQuietly(['po_document_path' => null]);
            }

            // Also clear on sales order if it matches
            SalesOrder::where('quotation_id', $quotation->id)
                ->where('po_document_path', $docPath)
                ->update(['po_document_path' => null]);

            $countDeleted++;
            Log::info("migrate-po-docs: File lokal dihapus: {$docPath}");
        } catch (\Throwable $e) {
            Log::warning("migrate-po-docs: Gagal hapus file lokal {$docPath}: " . $e->getMessage());
        }
    }
}
