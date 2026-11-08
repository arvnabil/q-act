<?php
require __DIR__ . '/vendor/autoload.php';
$app = require_once __DIR__ . '/bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

use Illuminate\Support\Facades\Mail;

try {
    Mail::raw('Test email dari Qsales - konfigurasi Exchange 365 berhasil!', function ($message) {
        $message->to(config('mail.from.address'))
                ->subject('[Qsales] Test Email Office 365 - ' . now()->format('d/m/Y H:i'));
    });
    echo "✓ Email berhasil dikirim ke: " . config('mail.from.address') . "\n";
} catch (\Exception $e) {
    echo "✗ GAGAL: " . $e->getMessage() . "\n";
}
