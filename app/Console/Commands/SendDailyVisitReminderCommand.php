<?php

namespace App\Console\Commands;

use App\Mail\DailyVisitReminderNotification;
use App\Models\LeadVisit;
use App\Models\User;
use App\Services\EmailNotificationService;
use Carbon\Carbon;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

class SendDailyVisitReminderCommand extends Command
{
    protected $signature = 'visits:send-daily-reminder';
    protected $description = 'Kirim email ringkasan agenda kunjungan hari ini kepada masing-masing sales pada pukul 07:00 pagi';

    public function handle(EmailNotificationService $emailService): int
    {
        $settings = $emailService->getSettings();
        $config = $settings['daily_visit_reminder'] ?? null;

        if (!$config || empty($config['enabled'])) {
            $this->info('Daily visit reminder is disabled in settings.');
            return self::SUCCESS;
        }

        $today = Carbon::today();
        $todayStr = $today->toDateString();

        // Ambil kunjungan yang dijadwalkan hari ini dan belum dibatalkan
        $visits = LeadVisit::with(['customer', 'lead', 'user'])
            ->whereNull('cancelled_at')
            ->whereDate('scheduled_at', $todayStr)
            ->orderBy('scheduled_at')
            ->get();

        if ($visits->isEmpty()) {
            $this->info('Tidak ada agenda kunjungan untuk hari ini. Tidak ada email yang dikirim.');
            return self::SUCCESS;
        }

        // Kelompokkan per user
        $groupedByUser = $visits->groupBy('user_id');
        $sentCount = 0;
        $dateFormatted = $today->translatedFormat('l, d F Y');

        foreach ($groupedByUser as $userId => $userVisits) {
            $user = User::find($userId);
            if (!$user || !$user->is_active || !$user->email) {
                continue;
            }

            try {
                $resolved = $emailService->resolveRecipients('daily_visit_reminder', [
                    'user_email'  => $user->email,
                    'sales_email' => $user->email,
                ]);

                if (!$resolved['enabled'] || empty($resolved['to'])) {
                    continue;
                }

                $mail = Mail::to($resolved['to']);
                if (!empty($resolved['cc'])) {
                    $mail->cc($resolved['cc']);
                }
                if (!empty($resolved['bcc'])) {
                    $mail->bcc($resolved['bcc']);
                }

                $mail->send(new DailyVisitReminderNotification($user, $userVisits, $dateFormatted));
                $sentCount++;
                $this->info("Reminder terkirim ke: {$user->email} ({$userVisits->count()} agenda)");
            } catch (\Throwable $e) {
                Log::error("Gagal mengirim daily visit reminder ke {$user->email}: " . $e->getMessage());
                $this->error("Gagal mengirim ke {$user->email}: " . $e->getMessage());
            }
        }

        $this->info("Selesai. Total reminder dikirim: {$sentCount}");
        return self::SUCCESS;
    }
}
