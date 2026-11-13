<?php

namespace App\Mail;

use App\Models\Lead;
use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Mail\Mailables\Attachment;
use Illuminate\Queue\SerializesModels;

class LeadPaidNotification extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public Lead $lead,
        public User $confirmedBy,
        public array $paymentProofs = [],
    ) {}

    public function attachments(): array
    {
        return collect($this->paymentProofs)->map(fn ($proof) => Attachment::fromStorageDisk('local', $proof->path)
            ->as($proof->original_name)
            ->withMime($proof->mime_type))->all();
    }

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
