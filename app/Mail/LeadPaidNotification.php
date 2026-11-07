<?php

namespace App\Mail;

use App\Models\Lead;
use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class LeadPaidNotification extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public Lead $lead,
        public User $confirmedBy,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: '[Q-Sales] Konfirmasi Terbayar – ' . ($this->lead->title ?? $this->lead->id),
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.lead-paid',
        );
    }
}
