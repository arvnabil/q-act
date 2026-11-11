<?php

namespace App\Mail;

use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class PasswordChangedNotification extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public User $user,
        public array $details = []
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: '[QSales][Keamanan] Kata Sandi Akun Berhasil Diubah'
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.password-changed',
            with: [
                'user'      => $this->user,
                'changedAt' => $this->details['changed_at'] ?? now()->translatedFormat('l, d F Y H:i:s'),
                'ipAddress' => $this->details['ip_address'] ?? 'Unknown',
                'userAgent' => $this->details['user_agent'] ?? 'Browser',
            ]
        );
    }
}
