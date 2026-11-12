<?php

namespace App\Jobs;

use App\Mail\PoConfirmationNotification;
use App\Models\PoNotificationLog;
use App\Models\Quotation;
use App\Models\QuotationPurchaseOrder;
use App\Models\SharePointDocument;
use App\Models\SystemSetting;
use App\Services\SharePointService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

class SendPoNotificationEmail implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 3;
    public int $backoff = 30;

    public function __construct(
        public readonly string $quotationId,
        public readonly string $purchaseOrderId
    ) {}

    public function handle(SharePointService $sharePoint): void
    {
        // 1. Check idempotency: already sent?
        $existingLog = PoNotificationLog::where('purchase_order_id', $this->purchaseOrderId)
            ->where('status', 'sent')
            ->first();

        if ($existingLog) {
            Log::info("SendPoNotificationEmail: Notification already sent for PO {$this->purchaseOrderId}.");
            return;
        }

        $quotation = Quotation::with(['customer', 'sales', 'lead'])->find($this->quotationId);
        $po = QuotationPurchaseOrder::find($this->purchaseOrderId);

        if (!$quotation || !$po) {
            Log::warning("SendPoNotificationEmail: Quotation {$this->quotationId} or PO {$this->purchaseOrderId} not found.");
            return;
        }

        // 2. Fetch SharePoint Document record
        $spDoc = SharePointDocument::where('source_type', 'quotation_purchase_order')
            ->where('source_id', $this->purchaseOrderId)
            ->first();

        $sharePointUrl = ($spDoc && $spDoc->status === 'synced') ? $spDoc->sharepoint_web_url : null;

        // 3. Resolve recipients using EmailNotificationService
        $notificationService = app(\App\Services\EmailNotificationService::class);
        $hasCustomConfig = SystemSetting::where('key', \App\Services\EmailNotificationService::KEY)->exists();

        if ($hasCustomConfig) {
            $resolved = $notificationService->resolveRecipients('po_uploaded', [
                'sales_email' => $quotation->sales?->email,
            ]);

            // If explicitly disabled by admin toggle, do NOT send email
            if (!$resolved['enabled']) {
                Log::info("SendPoNotificationEmail: Notifikasi email PO dinonaktifkan di pengaturan untuk PO {$this->purchaseOrderId}.");
                return;
            }

            $recipients    = $resolved['to'];
            $ccRecipients  = $resolved['cc'];
            $bccRecipients = $resolved['bcc'];
        } else {
            // Fallback for initial state before admin configures Email Notifications tab
            $resolved = $notificationService->resolveRecipients('po_uploaded', [
                'sales_email' => $quotation->sales?->email,
            ]);

            if ($resolved['enabled'] && !empty($resolved['to'])) {
                $recipients    = $resolved['to'];
                $ccRecipients  = $resolved['cc'];
                $bccRecipients = $resolved['bcc'];
            } else {
                $spSetting = SystemSetting::find('sharepoint_integration');
                $spVal = $spSetting ? (array) $spSetting->value : [];
                $financeEmail = $spVal['notification_finance_email'] ?? env('NOTIFICATION_FINANCE_EMAIL', 'finance@activ.co.id');
                $directorEmail = $spVal['notification_director_email'] ?? env('NOTIFICATION_DIRECTOR_EMAIL', 'director@activ.co.id');
                $salesEmail = $quotation->sales?->email;

                $recipients    = array_values(array_filter(array_unique([$financeEmail])));
                $ccRecipients  = array_values(array_filter(array_unique([$salesEmail])));
                $bccRecipients = array_values(array_filter(array_unique([$directorEmail])));
            }
        }

        if (empty($recipients)) {
            Log::info("SendPoNotificationEmail: No recipients configured for PO notification.");
            return;
        }

        // 4. Pre-grant SharePoint permission if item ID is present
        if ($spDoc && $spDoc->sharepoint_item_id && $sharePoint->isConfigured()) {
            try {
                $allEmails = array_values(array_unique(array_merge($recipients, $ccRecipients, $bccRecipients)));
                $sharePoint->grantPermission($spDoc->sharepoint_item_id, $allEmails, ['read']);
            } catch (\Throwable $e) {
                Log::debug('SharePoint grantPermission warning in email job: ' . $e->getMessage());
            }
        }

        // 5. Build template data
        $baseUrl = config('app.url', 'https://qsales.activ.co.id');
        $data = [
            'customerName'   => $quotation->customer?->name ?? 'Pelanggan',
            'poNumber'       => $po->po_number ?: '-',
            'poDate'         => $po->po_date ? $po->po_date->format('d/m/Y') : date('d/m/Y'),
            'quotationId'    => $quotation->id,
            'salesName'      => $quotation->sales?->name ?? '-',
            'leadCode'       => $quotation->lead?->lead_code,
            'grandTotal'     => (float) $quotation->grand_total,
            'sharePointUrl'  => $sharePointUrl,
            'qsalesUrl'      => "{$baseUrl}/quotations/{$quotation->id}",
        ];

        $subject = "[QSales][PO Masuk] {$data['customerName']} - {$data['poNumber']} ({$data['quotationId']})";

        // 6. Send Email
        try {
            $mail = Mail::to($recipients);
            if (!empty($ccRecipients)) {
                $mail->cc($ccRecipients);
            }
            if (!empty($bccRecipients)) {
                $mail->bcc($bccRecipients);
            }
            $mail->send(new PoConfirmationNotification($data));

            PoNotificationLog::create([
                'purchase_order_id' => $this->purchaseOrderId,
                'quotation_id'      => $this->quotationId,
                'recipients'        => ['to' => $recipients, 'cc' => $ccRecipients, 'bcc' => $bccRecipients],
                'subject'           => $subject,
                'status'            => 'sent',
                'sent_at'           => now(),
            ]);

            Log::info("SendPoNotificationEmail: Notification sent successfully for PO {$this->purchaseOrderId}.");
        } catch (\Throwable $e) {
            Log::error("SendPoNotificationEmail failed for PO {$this->purchaseOrderId}: " . $e->getMessage());

            PoNotificationLog::create([
                'purchase_order_id' => $this->purchaseOrderId,
                'quotation_id'      => $this->quotationId,
                'recipients'        => ['to' => $recipients, 'cc' => $ccRecipients, 'bcc' => $bccRecipients],
                'subject'           => $subject,
                'status'            => 'failed',
                'error_message'     => $e->getMessage(),
            ]);

            throw $e;
        }
    }
}
