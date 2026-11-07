<?php

namespace App\Jobs;

use App\Mail\ExportReadyNotification;
use App\Models\ExportJob;
use App\Models\SalesOrder;
use App\Services\SalesOrderExcelService;
use Carbon\Carbon;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Storage;
use ZipArchive;

class ProcessSalesOrdersZipExport implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $timeout = 600; // 10 minutes timeout for big batches

    public function __construct(
        public string $exportJobId,
        public array $salesOrderIds
    ) {}

    public function handle(SalesOrderExcelService $excelService): void
    {
        $exportJob = ExportJob::with('user')->find($this->exportJobId);
        if (!$exportJob) return;

        $exportJob->update([
            'status' => 'processing',
            'progress' => 5,
        ]);

        try {
            $total = count($this->salesOrderIds);
            if ($total === 0) {
                $exportJob->update([
                    'status' => 'failed',
                    'error_message' => 'Tidak ada data Sales Order yang dipilih.',
                ]);
                return;
            }

            // Create temporary export directory in storage/app/exports
            $exportDir = 'exports/' . $exportJob->id;
            Storage::makeDirectory($exportDir);

            $zipFileName = 'Sales_Orders_Export_' . Carbon::now()->format('Ymd_His') . '.zip';
            $zipRelativePath = $exportDir . '/' . $zipFileName;
            $zipFullPath = Storage::path($zipRelativePath);

            // Initialize ZipArchive
            $zip = new ZipArchive();
            if ($zip->open($zipFullPath, ZipArchive::CREATE | ZipArchive::OVERWRITE) !== true) {
                throw new \Exception("Gagal menginisialisasi file zip pada path: {$zipFullPath}");
            }

            $processed = 0;
            // Fetch in chunks or batch with relationships
            $salesOrders = SalesOrder::whereIn('id', $this->salesOrderIds)
                ->with(['customer', 'sales', 'quotation', 'items.product', 'costs.category'])
                ->get();

            foreach ($salesOrders as $so) {
                try {
                    $excelBinary = $excelService->generate($so);
                    
                    // Sanitize file name for zip entry
                    $safeCustomer = preg_replace('/[^A-Za-z0-9_\-]/', '_', $so->customer?->name ?: 'Customer');
                    $safeSoId = preg_replace('/[^A-Za-z0-9_\-\.]/', '_', $so->id);
                    $excelEntryName = "{$safeSoId}_{$safeCustomer}.xlsx";

                    $zip->addFromString($excelEntryName, $excelBinary);
                } catch (\Throwable $itemErr) {
                    Log::warning("Gagal render excel SO ID {$so->id}: " . $itemErr->getMessage());
                }

                $processed++;
                $progressPercent = min(95, (int) round(($processed / $total) * 90) + 5);

                // Update progress every 2 items or on completion
                if ($processed % 2 === 0 || $processed === $total) {
                    $exportJob->update([
                        'processed_items' => $processed,
                        'progress' => $progressPercent,
                    ]);
                }
            }

            $zip->close();

            $fileSize = file_exists($zipFullPath) ? filesize($zipFullPath) : 0;

            $exportJob->update([
                'status' => 'completed',
                'progress' => 100,
                'processed_items' => $processed,
                'file_path' => $zipRelativePath,
                'file_name' => $zipFileName,
                'file_size' => $fileSize,
                'completed_at' => Carbon::now(),
                'expires_at' => Carbon::now()->addDays(7), // Available for 7 days
            ]);

            // Send notification email to the user requesting the export
            if ($exportJob->user && $exportJob->user->email) {
                try {
                    $downloadUrl = route('downloads.download', $exportJob->id);
                    Mail::to($exportJob->user->email)->send(
                        new ExportReadyNotification($exportJob, $exportJob->user, $downloadUrl)
                    );
                    Log::info("Email notifikasi ekspor berhasil dikirim ke: {$exportJob->user->email}");
                } catch (\Throwable $mailErr) {
                    Log::warning("Gagal mengirim email notifikasi ekspor ke {$exportJob->user->email}: " . $mailErr->getMessage());
                }
            }

        } catch (\Throwable $e) {
            Log::error("ProcessSalesOrdersZipExport Error: " . $e->getMessage(), [
                'export_job_id' => $this->exportJobId,
                'trace' => $e->getTraceAsString(),
            ]);

            $exportJob->update([
                'status' => 'failed',
                'error_message' => $e->getMessage(),
            ]);
        }
    }
}
