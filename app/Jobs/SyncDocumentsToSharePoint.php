<?php

namespace App\Jobs;

use App\Models\ActivityLog;
use App\Models\Quotation;
use App\Models\QuotationPurchaseOrder;
use App\Models\SharePointDocument;
use App\Services\SharePointService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;

class SyncDocumentsToSharePoint implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 5;
    public int $timeout = 180;
    public int $backoff = 60;

    public function __construct(
        public readonly string $quotationId,
        public readonly string $purchaseOrderId,
        public readonly ?string $uploadedBy = null
    ) {}

    public function handle(SharePointService $sharePoint): void
    {
        $quotation = Quotation::with(['customer', 'sales'])->find($this->quotationId);
        $po = QuotationPurchaseOrder::find($this->purchaseOrderId);

        if (!$quotation || !$po) {
            Log::warning("SyncDocumentsToSharePoint: Quotation {$this->quotationId} or PO {$this->purchaseOrderId} not found.");
            return;
        }

        // Determine PO document relative path
        $docPath = $po->document_path ?: $quotation->po_document_path;
        if (empty($docPath)) {
            Log::info("SyncDocumentsToSharePoint: No document path attached for PO {$this->purchaseOrderId}.");
            // Still dispatch email notification in fallback mode
            dispatch(new SendPoNotificationEmail($this->quotationId, $this->purchaseOrderId));
            return;
        }

        // Check if file exists on public or default disk
        $disk = Storage::disk('public')->exists($docPath) ? Storage::disk('public') : Storage::disk('local');
        if (!$disk->exists($docPath)) {
            throw new \RuntimeException("PO document file not found on storage disk: {$docPath}");
        }

        $localFilePath = $disk->path($docPath);
        $fileSize = $disk->size($docPath);
        $originalFilename = basename($docPath);

        // Find or create SharePointDocument record for idempotency
        $spDoc = SharePointDocument::firstOrCreate(
            [
                'source_type'       => 'quotation_purchase_order',
                'source_id'         => $this->purchaseOrderId,
                'document_type'     => 'customer_po',
            ],
            [
                'purchase_order_id' => $this->purchaseOrderId,
                'quotation_id'      => $this->quotationId,
                'original_filename' => $originalFilename,
                'file_size'         => $fileSize,
                'mime_type'         => mime_content_type($localFilePath) ?: 'application/octet-stream',
                'status'            => 'pending',
                'uploaded_by'       => $this->uploadedBy,
            ]
        );

        if ($spDoc->status === 'synced' && !empty($spDoc->sharepoint_web_url)) {
            Log::info("SyncDocumentsToSharePoint: PO {$this->purchaseOrderId} document already synced to SharePoint.");
            dispatch(new SendPoNotificationEmail($this->quotationId, $this->purchaseOrderId));
            return;
        }

        // If SharePoint is not configured or disabled
        if (!$sharePoint->isConfigured()) {
            $spDoc->update([
                'status'        => 'pending',
                'error_message' => 'SharePoint integration is disabled or not configured in settings.',
            ]);
            Log::info("SyncDocumentsToSharePoint: SharePoint not configured. PO notification dispatched without SharePoint links.");
            dispatch(new SendPoNotificationEmail($this->quotationId, $this->purchaseOrderId));
            return;
        }

        $spDoc->update([
            'status'        => 'uploading',
            'error_message' => null,
        ]);

        // 1. Build SharePoint folder hierarchy
        $folderPath = $sharePoint->buildFolderPath($quotation, $po);
        $sharePoint->ensureFolder($folderPath);

        // 2. Upload Customer PO file
        $ext = pathinfo($originalFilename, PATHINFO_EXTENSION);
        $cleanPoNum = $sharePoint->sanitizeFilename($po->po_number ?: 'PO');
        $uploadFilename = "PO_{$cleanPoNum}" . ($ext ? ".{$ext}" : '');

        $driveItem = $sharePoint->uploadFile($folderPath, $uploadFilename, $localFilePath);
        $itemId = $driveItem['id'] ?? null;
        $webUrl = $driveItem['webUrl'] ?? null;

        // 3. Optional: Create organization link if webUrl is restricted
        if ($itemId && !empty($driveItem)) {
            // Attempt pre-grant access or organization link
            try {
                $sharingLink = $sharePoint->createSharingLink($itemId, 'view', 'organization');
                if (!empty($sharingLink['link']['webUrl'])) {
                    $webUrl = $sharingLink['link']['webUrl'];
                }
            } catch (\Throwable $e) {
                Log::debug('SharePoint createSharingLink fallback to webUrl: ' . $e->getMessage());
            }
        }

        // 4. Update SharePointDocument status for Customer PO
        $spDoc->update([
            'sharepoint_item_id'     => $itemId,
            'sharepoint_web_url'     => $webUrl,
            'sharepoint_folder_path' => $folderPath,
            'status'                 => 'synced',
            'synced_at'              => now(),
            'error_message'          => null,
        ]);

        // 4b. Generate and upload Quotation PDF to the same folder
        try {
            $pdfService = app(\App\Services\QuotationPdfService::class);
            $cleanQuotId = $sharePoint->sanitizeFilename($quotation->id);
            $quotUploadName = "Quotation_{$cleanQuotId}.pdf";
            $quotDiskPath = 'quotations/Quotation_' . $cleanQuotId . '.pdf';
            $localQuotFile = Storage::disk('public')->path($quotDiskPath);

            $pdfService->saveToFile($quotation, $localQuotFile);

            if (file_exists($localQuotFile)) {
                $quotDriveItem = $sharePoint->uploadFile($folderPath, $quotUploadName, $localQuotFile);
                $quotItemId = $quotDriveItem['id'] ?? null;
                $quotWebUrl = $quotDriveItem['webUrl'] ?? null;

                if ($quotItemId && !empty($quotDriveItem)) {
                    try {
                        $sharingLink = $sharePoint->createSharingLink($quotItemId, 'view', 'organization');
                        if (!empty($sharingLink['link']['webUrl'])) {
                            $quotWebUrl = $sharingLink['link']['webUrl'];
                        }
                    } catch (\Throwable $e) {
                        Log::debug('SharePoint createSharingLink for quotation fallback to webUrl: ' . $e->getMessage());
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
                        'original_filename'      => basename($localQuotFile),
                        'file_size'              => filesize($localQuotFile),
                        'mime_type'              => 'application/pdf',
                        'sharepoint_item_id'     => $quotItemId,
                        'sharepoint_web_url'     => $quotWebUrl,
                        'sharepoint_folder_path' => $folderPath,
                        'status'                 => 'synced',
                        'synced_at'              => now(),
                        'uploaded_by'            => $this->uploadedBy,
                        'error_message'          => null,
                    ]
                );
            }
        } catch (\Throwable $e) {
            Log::warning("SyncDocumentsToSharePoint: Gagal upload Quotation PDF: " . $e->getMessage());
        }

        // 5. Activity Log
        ActivityLog::create([
            'user_id'     => $this->uploadedBy,
            'action'      => 'SHAREPOINT_UPLOAD',
            'entity_type' => 'QUOTATION_PURCHASE_ORDER',
            'entity_id'   => $this->purchaseOrderId,
            'description' => "Dokumen PO berhasil disinkronisasi ke SharePoint: {$uploadFilename}",
        ]);

        // 6. Dispatch email notification with SharePoint links
        dispatch(new SendPoNotificationEmail($this->quotationId, $this->purchaseOrderId));
    }

    public function failed(\Throwable $exception): void
    {
        Log::error("SyncDocumentsToSharePoint failed for PO {$this->purchaseOrderId}: " . $exception->getMessage());

        SharePointDocument::where('source_type', 'quotation_purchase_order')
            ->where('source_id', $this->purchaseOrderId)
            ->update([
                'status'        => 'failed',
                'error_message' => substr($exception->getMessage(), 0, 1000),
                'retry_count'   => DB::raw('retry_count + 1'),
            ]);

        ActivityLog::create([
            'user_id'     => $this->uploadedBy,
            'action'      => 'SHAREPOINT_UPLOAD_FAILED',
            'entity_type' => 'QUOTATION_PURCHASE_ORDER',
            'entity_id'   => $this->purchaseOrderId,
            'description' => "Gagal sinkronisasi dokumen ke SharePoint: " . substr($exception->getMessage(), 0, 250),
        ]);

        // Fallback: Send email notification indicating sync error
        dispatch(new SendPoNotificationEmail($this->quotationId, $this->purchaseOrderId));
    }
}
