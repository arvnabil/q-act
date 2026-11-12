<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

// Stale lead notifications: run daily at 08:00 WIB
Schedule::command('leads:notify-stale')->dailyAt('08:00');

// Daily visit reminder: run daily at 07:00 WIB (skipped automatically if no visits today)
Schedule::command('visits:send-daily-reminder')->dailyAt('07:00');

// Auto complete overdue visits (> 2 days): run daily at 00:30 WIB
Schedule::command('visits:auto-complete-overdue')->dailyAt('00:30');

// Customer PIC birthday reminder (H-7): run daily at 07:30 WIB
Schedule::command('customers:send-birthday-reminders')->dailyAt('07:30');
