<?php

namespace App\Mail;

use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class NewUserInvitationNotification extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public User $user,
        public string $setupPasswordUrl,
        public ?User $invitedBy = null,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: "[Q-Sales] Selamat Datang di Q-Sales Portal – Undangan & Aktivasi Akun",
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.new-user-invitation',
        );
    }
}
