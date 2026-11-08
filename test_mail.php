<?php
require __DIR__ . '/vendor/autoload.php';
$app = require_once __DIR__ . '/bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

use Illuminate\Support\Facades\Mail;

$to = $argv[1] ?? config('mail.from.address');

try {
    $from = config('mail.from.address');
    echo "Pengirim (From): {$from}\n";
    echo "Penerima (To): {$to}\n";

    Mail::mailer('microsoft-graph')
        ->raw("Test email dari Qsales via Microsoft Graph API\nPengirim: {$from}\nPenerima: {$to}\nWaktu: " . now()->format('d/m/Y H:i:s'), function ($message) use ($to, $from) {
            $message->to($to)
                    ->from($from, config('mail.from.name'))
                    ->subject('[Qsales] Test Microsoft Graph (From: ' . $from . ') - ' . now()->format('d/m/Y H:i'));
        });
    echo "✓ Email berhasil dikirim ke: {$to} dari: {$from}\n";
} catch (\Exception $e) {
    echo "✗ GAGAL: " . $e->getMessage() . "\n";
}
