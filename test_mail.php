<?php
require __DIR__ . '/vendor/autoload.php';
$app = require_once __DIR__ . '/bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

use Illuminate\Support\Facades\Mail;

$to = $argv[1] ?? config('mail.from.address');

try {
    Mail::mailer('microsoft-graph')
        ->raw('Test email dari Qsales via Microsoft Graph API - ' . now()->format('d/m/Y H:i'), function ($message) use ($to) {
            $message->to($to)
                    ->subject('[Qsales] Test Microsoft Graph - ' . now()->format('d/m/Y H:i'));
        });
    echo "✓ Email berhasil dikirim ke: {$to}\n";
} catch (\Exception $e) {
    echo "✗ GAGAL: " . $e->getMessage() . "\n";
}
