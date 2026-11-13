<?php

namespace App\Jobs;

use App\Models\ActivityLog;
use App\Models\LeadPaymentProof;
use App\Models\Quotation;
use App\Models\QuotationPurchaseOrder;
use App\Models\SharePointDocument;
use App\Services\SharePointService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;

class SyncLeadPaymentProofToSharePoint implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 5;
    public int $timeout = 180;
    public array $backoff = [30, 60, 120, 300];

    public function __construct(public readonly string $proofId) {}

    private function existingFolderPath(Quotation $quotation, ?QuotationPurchaseOrder $purchaseOrder): ?string
    {
        if ($purchaseOrder) {
            return SharePointDocument::where('source_type', 'quotation_purchase_order')
                ->where('source_id', $purchaseOrder->id)->where('document_type', 'customer_po')
                ->whereNotNull('sharepoint_folder_path')->value('sharepoint_folder_path');
        }

        // The quotation PDF is uploaded beside the SO in this established
        // transaction folder. Reuse its exact path instead of creating a new
        // quotation-only folder.
        $quotationFolder = SharePointDocument::where('source_type', 'quotation')
            ->where('source_id', $quotation->id)->where('document_type', 'quotation_pdf')
            ->whereNotNull('sharepoint_folder_path')->orderByDesc('synced_at')->first();
        if ($quotationFolder?->sharepoint_folder_path) {
            return $quotationFolder->sharepoint_folder_path;
        }

        $purchaseOrderFolders = SharePointDocument::where('quotation_id', $quotation->id)
            ->where('document_type', 'customer_po')->whereNotNull('sharepoint_folder_path')
            ->pluck('sharepoint_folder_path')->unique()->values();

        return $purchaseOrderFolders->count() === 1 ? $purchaseOrderFolders->first() : null;
    }

    public function handle(SharePointService $sharePoint): void
    {
        $proof = LeadPaymentProof::with(['quotation.sales', 'purchaseOrder.quotation.sales', 'salesOrder.quotation.sales'])
            ->find($this->proofId);
        $document = SharePointDocument::where('source_type', 'lead_payment_proof')
            ->where('source_id', $this->proofId)->where('document_type', 'payment_proof')->first();

        if (! $proof || ! $document) {
            Log::warning("Payment proof {$this->proofId} or SharePoint document record not found.");
            return;
        }

        $quotation = $proof->quotation
            ?: $proof->purchaseOrder?->quotation
            ?: $proof->salesOrder?->quotation;
        if (! $quotation) {
            $document->update(['status' => 'failed', 'error_message' => 'Quotation sumber bukti pembayaran tidak ditemukan.']);
            return;
        }

        $purchaseOrder = $proof->purchaseOrder;
        if (! $purchaseOrder && $proof->salesOrder?->po_number) {
            $purchaseOrder = QuotationPurchaseOrder::where('quotation_id', $quotation->id)
                ->where('po_number', $proof->salesOrder->po_number)->first();
        }

        $disk = Storage::disk('local');
        if (! $disk->exists($proof->path)) {
            throw new \RuntimeException("Payment proof file not found: {$proof->path}");
        }
        if (! $sharePoint->isConfigured()) {
            $document->update(['status' => 'failed', 'error_message' => 'SharePoint integration is disabled or not configured in settings.']);
            return;
        }

        $filePath = $disk->path($proof->path);
        $folderPath = $this->existingFolderPath($quotation, $purchaseOrder);
        if (! $folderPath && $purchaseOrder) {
            $folderPath = $sharePoint->buildFolderPath($quotation, $purchaseOrder);
        }
        if (! $folderPath && ! $purchaseOrder) {
            $quotationPurchaseOrders = QuotationPurchaseOrder::where('quotation_id', $quotation->id)->get();
            if ($quotationPurchaseOrders->count() === 1) {
                $purchaseOrder = $quotationPurchaseOrders->first();
                $folderPath = $this->existingFolderPath($quotation, $purchaseOrder)
                    ?: $sharePoint->buildFolderPath($quotation, $purchaseOrder);
            }
        }
        if (! $folderPath) {
            throw new \RuntimeException('Folder SharePoint transaksi untuk quotation ini belum dapat dipastikan. Hubungkan bukti ke PO yang tepat atau sinkronkan Quotation/SO terlebih dahulu.');
        }
        $document->update(['status' => 'uploading', 'error_message' => null, 'sharepoint_folder_path' => $folderPath]);

        $sharePoint->ensureFolder($folderPath);
        $cleanQuotationId = $sharePoint->sanitizeFilename($quotation->id);
        $cleanOriginalName = $sharePoint->sanitizeFilename(pathinfo($proof->original_name, PATHINFO_FILENAME));
        $extension = pathinfo($proof->original_name, PATHINFO_EXTENSION);
        $filename = 'PaymentProof_' . $cleanQuotationId . '_' . substr(str_replace('-', '', $proof->id), 0, 8)
            . '_' . $cleanOriginalName . ($extension ? '.' . $sharePoint->sanitizeFilename($extension) : '');
        $driveItem = $sharePoint->uploadFile($folderPath, $filename, $filePath);
        $webUrl = $driveItem['webUrl'] ?? null;
        $itemId = $driveItem['id'] ?? null;

        if ($itemId) {
            try {
                $link = $sharePoint->createSharingLink($itemId, 'view', 'organization');
                $webUrl = $link['link']['webUrl'] ?? $webUrl;
            } catch (\Throwable $exception) {
                Log::debug('Payment proof SharePoint sharing link fallback to webUrl: ' . $exception->getMessage());
            }
        }

        $document->update([
            'quotation_id' => $quotation->id,
            'purchase_order_id' => $purchaseOrder?->id,
            'sharepoint_item_id' => $itemId,
            'sharepoint_web_url' => $webUrl,
            'sharepoint_folder_path' => $folderPath,
            'status' => 'synced',
            'synced_at' => now(),
            'error_message' => null,
        ]);

        ActivityLog::create([
            'user_id' => $proof->uploaded_by,
            'action' => 'PAYMENT_PROOF_SHAREPOINT_UPLOAD',
            'entity_type' => 'LEAD_PAYMENT_PROOF',
            'entity_id' => $proof->id,
            'description' => "Bukti pembayaran {$proof->original_name} disinkronisasi ke SharePoint untuk Quotation {$quotation->id}.",
        ]);
    }

    public function failed(\Throwable $exception): void
    {
        SharePointDocument::where('source_type', 'lead_payment_proof')
            ->where('source_id', $this->proofId)->where('document_type', 'payment_proof')
            ->update([
                'status' => 'failed',
                'error_message' => substr($exception->getMessage(), 0, 1000),
                'retry_count' => \Illuminate\Support\Facades\DB::raw('retry_count + 1'),
            ]);

        Log::error("SharePoint payment proof sync failed for {$this->proofId}: " . $exception->getMessage());
    }
}
