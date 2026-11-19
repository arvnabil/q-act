<?php

namespace App\Console\Commands;

use App\Mail\ZoomRenewalReminder;
use App\Models\ZoomSubAccount;
use App\Models\ZoomSubAccountDetail;
use App\Services\EmailNotificationService;
use App\Services\ZoomService;
use Carbon\Carbon;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

class SendZoomRenewalRemindersCommand extends Command
{
    protected $signature = 'zoom:send-renewal-reminders';
    protected $description = 'Kirim reminder renewal Zoom ke Sales PIC sesuai jadwal notifikasi.';

    public function handle(EmailNotificationService $emailService, ZoomService $zoomService): int
    {
        $config = $emailService->getSettings()['zoom_renewal_reminder'] ?? [];
        $daysBefore = array_values(array_unique(array_intersect([7, 30, 60, 90], array_map('intval', (array) ($config['days_before'] ?? [])))));

        if (empty($config['enabled']) || $daysBefore === []) {
            $this->info('Reminder renewal Zoom nonaktif atau belum ada jarak hari yang dipilih.');
            return self::SUCCESS;
        }

        $dateToDays = collect($daysBefore)->mapWithKeys(fn (int $days) => [Carbon::today()->addDays($days)->toDateString() => $days]);
        $accounts = ZoomSubAccount::query()
            ->with(['salesPic', 'customer'])
            ->where('is_present', true)
            ->whereIn(DB::raw('DATE(subscription_end_time)'), $dateToDays->keys()->all())
            ->get();

        $sent = 0;
        foreach ($accounts as $account) {
            $salesPic = $account->salesPic;
            $isSalesPic = $salesPic && (in_array($salesPic->role, ['Sales', 'Presales'], true)
                || $salesPic->hasAnyRole(['Sales', 'Presales']));
            $hasValidSalesPic = $salesPic
                && $salesPic->is_active
                && $isSalesPic
                && filter_var($salesPic->email, FILTER_VALIDATE_EMAIL);
            $hasCustomer = $account->customer !== null;
            $fallbackToSalesInbox = ! $hasCustomer || ! $hasValidSalesPic;
            $recipientEmail = $fallbackToSalesInbox ? 'sales@activ.co.id' : $salesPic->email;

            $renewalDate = $account->subscription_end_time->copy()->startOfDay();
            $days = $dateToDays[$renewalDate->toDateString()] ?? null;
            if (! $days) {
                continue;
            }

            $inserted = DB::table('zoom_renewal_reminder_logs')->insertOrIgnore([
                'zoom_account_id' => $account->zoom_account_id,
                'renewal_date' => $renewalDate->toDateString(),
                'days_before' => $days,
                'sent_at' => now(),
                'created_at' => now(),
                'updated_at' => now(),
            ]);
            if ($inserted !== 1) {
                continue;
            }

            try {
                $detailCache = ZoomSubAccountDetail::query()
                    ->where('zoom_account_id', $account->zoom_account_id)
                    ->where('detail_type', 'account')
                    ->first();
                $cachedDetails = (array) ($detailCache?->payload ?? []);
                $hasCachedDetails = $cachedDetails !== [];
                $detailResult = $hasCachedDetails
                    ? ['available' => true, 'data' => $cachedDetails]
                    : $zoomService->readSubAccount($account->zoom_account_id, 'account');
                $zoomDetails = $detailResult['available']
                    ? (array) $detailResult['data']
                    : $cachedDetails;

                if (! $hasCachedDetails && $detailResult['available']) {
                    ZoomSubAccountDetail::query()->updateOrCreate(
                        ['zoom_account_id' => $account->zoom_account_id, 'detail_type' => 'account'],
                        ['payload' => $zoomDetails, 'fetched_at' => now()]
                    );
                }

                $options = (array) ($zoomDetails['options'] ?? []);
                $accountDetails = [
                    'account_name' => $zoomDetails['account_name'] ?? $account->account_name ?? 'Tanpa nama',
                    'account_number' => $zoomDetails['account_number'] ?? $account->account_number ?? '—',
                    'account_type' => $zoomDetails['account_type'] ?? $account->account_type ?? '—',
                    'account_owner' => $zoomDetails['owner_email'] ?? $account->owner_email ?? '—',
                    'who_will_pay' => match ($options['pay_mode'] ?? null) {
                        'master' => 'Master account holder',
                        'sub' => 'Sub-account holder',
                        default => 'Tidak tersedia',
                    },
                    'seats' => $zoomDetails['seats'] ?? $account->seats ?? '—',
                    'creation_time' => $this->formatDateTime($zoomDetails['created_at'] ?? $account->zoom_created_at),
                    'service_effective_date' => $this->formatDate($zoomDetails['subscription_start_time'] ?? $account->subscription_start_time),
                    'subscription_end' => $this->formatDate($renewalDate),
                    'auto_renew' => is_bool($options['billing_auto_renew'] ?? null)
                        ? ($options['billing_auto_renew'] ? 'Ya' : 'Tidak')
                        : 'Tidak tersedia',
                    'customer_name' => $account->customer?->name ?? 'Belum ditautkan',
                    'sales_pic_name' => $hasValidSalesPic ? $salesPic->name : 'Belum tersedia',
                    'sales_pic_email' => $hasValidSalesPic ? $salesPic->email : '—',
                    'follow_up_notes' => array_values(array_filter([
                        $hasCustomer ? null : 'Customer QSales belum ditautkan.',
                        $hasValidSalesPic ? null : match (true) {
                            ! $salesPic => 'Sales PIC renewal belum ditentukan.',
                            ! $salesPic->is_active => 'Sales PIC renewal tidak aktif.',
                            ! $isSalesPic => 'Pengguna terpilih bukan role Sales atau Presales.',
                            ! filter_var($salesPic->email, FILTER_VALIDATE_EMAIL) => 'Email Sales PIC renewal tidak tersedia atau tidak valid.',
                            default => null,
                        },
                    ])),
                ];

                Mail::to($recipientEmail)->send(new ZoomRenewalReminder(
                    $account,
                    $hasValidSalesPic ? $salesPic : null,
                    $days,
                    $renewalDate,
                    $accountDetails,
                    $fallbackToSalesInbox,
                ));
                $sent++;
                $this->info("Reminder H-{$days} terkirim ke {$recipientEmail} untuk Zoom Account {$account->zoom_account_id}.");
            } catch (\Throwable $exception) {
                DB::table('zoom_renewal_reminder_logs')
                    ->where('zoom_account_id', $account->zoom_account_id)
                    ->whereDate('renewal_date', $renewalDate->toDateString())
                    ->where('days_before', $days)
                    ->delete();
                Log::error('[Zoom Renewal Reminder] Email gagal dikirim', [
                    'zoom_account_id' => $account->zoom_account_id,
                    'sales_pic_id' => $salesPic?->id,
                    'message' => $exception->getMessage(),
                ]);
            }
        }

        $this->info("Selesai. Total reminder terkirim: {$sent}; akun dengan data customer atau PIC belum lengkap diarahkan ke sales@activ.co.id.");
        return self::SUCCESS;
    }

    private function formatDate(mixed $value): string
    {
        if (! $value) {
            return '—';
        }

        try {
            return Carbon::parse($value)->format('d M Y');
        } catch (\Throwable) {
            return '—';
        }
    }

    private function formatDateTime(mixed $value): string
    {
        if (! $value) {
            return '—';
        }

        try {
            return Carbon::parse($value)->format('d M Y, H.i');
        } catch (\Throwable) {
            return '—';
        }
    }
}
