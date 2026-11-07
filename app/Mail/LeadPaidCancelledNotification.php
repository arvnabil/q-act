<?php

namespace App\Mail;

use App\Models\Lead;
use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class LeadPaidCancelledNotification extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public Lead $lead,
        public User $revertedBy,
        public string $oldStage,
        public string $newStage,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: '[Q-Sales] [REVISI/KOREKSI] Pembatalan Konfirmasi Terbayar – Lead: ' . ($this->lead->title ?? $this->lead->id),
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.lead-paid-cancelled',
        );
    }
}
