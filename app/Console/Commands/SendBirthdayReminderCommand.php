<?php

namespace App\Console\Commands;

use App\Mail\CustomerBirthdayReminderNotification;
use App\Models\Customer;
use App\Models\CustomerPic;
use App\Models\User;
use App\Services\EmailNotificationService;
use Carbon\Carbon;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

class SendBirthdayReminderCommand extends Command
{
    protected $signature = 'customers:send-birthday-reminders';
    protected $description = 'Kirim email pengingat H-7 ulang tahun PIC customer kepada Sales PIC yang bersangkutan';

    public function handle(EmailNotificationService $emailService): int
    {
        $settings = $emailService->getSettings();
        $config = $settings['customer_birthday_reminder'] ?? null;

        if (!$config || empty($config['enabled'])) {
            $this->info('Customer birthday reminder is disabled in settings.');
            return self::SUCCESS;
        }

        $targetDate = Carbon::today()->addDays(7);
        $targetMonthDay = $targetDate->format('m-d'); // MM-DD

        $pics = CustomerPic::whereNotNull('crm_profile')->get();
        $matchingPics = $pics->filter(function ($pic) use ($targetMonthDay) {
            $bday = $pic->crm_profile['birthday'] ?? null;
            if (!$bday || strlen($bday) < 10) {
                return false;
            }
            return substr($bday, 5, 5) === $targetMonthDay;
        });

        if ($matchingPics->isEmpty()) {
            $this->info("Tidak ada PIC customer yang berulang tahun pada H-7 ({$targetDate->format('d M')}).");
            return self::SUCCESS;
        }

        $sentCount = 0;

        foreach ($matchingPics as $pic) {
            $customer = Customer::find($pic->customer_id);
            if (!$customer) {
                continue;
            }

            // Tentukan Sales PIC: dari PIC, atau dari customer, atau fallback
            $salesUser = null;
            if ($pic->sales_id) {
                $salesUser = User::find($pic->sales_id);
            } elseif ($customer->created_by) {
                $salesUser = User::find($customer->created_by);
            }

            $salesEmail = $salesUser?->email;

            try {
                $resolved = $emailService->resolveRecipients('customer_birthday_reminder', [
                    'sales_email' => $salesEmail,
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

                $birthdayCarbon = Carbon::parse($pic->crm_profile['birthday']);
                $bdayFormatted = $birthdayCarbon->translatedFormat('d F');

                $mail->send(new CustomerBirthdayReminderNotification(
                    $pic,
                    $customer,
                    $salesUser,
                    7,
                    $bdayFormatted
                ));

                $sentCount++;
                $this->info("Pengingat H-7 ulang tahun PIC '{$pic->name}' terkirim ke: " . implode(', ', $resolved['to']));
            } catch (\Throwable $e) {
                Log::error("Gagal mengirim birthday reminder PIC {$pic->id}: " . $e->getMessage());
                $this->error("Gagal mengirim untuk PIC {$pic->name}: " . $e->getMessage());
            }
        }

        $this->info("Selesai. Total birthday reminder dikirim: {$sentCount}");
        return self::SUCCESS;
    }
}
