<?php

namespace App\Mail;

use App\Models\ChangeRequest;
use App\Models\Quotation;
use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class ChangeRequestSubmittedNotification extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public ChangeRequest $changeRequest,
        public Quotation $quotation,
        public User $requester,
    ) {}

    public function envelope(): Envelope
    {
        $typeLabel = $this->changeRequest->type === 'cancellation' ? 'Pembatalan' : 'Revisi';
        return new Envelope(
            subject: "[Q-Sales] Pengajuan {$typeLabel} Quotation #{$this->quotation->id} – {$this->quotation->customer_name}",
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.change-request-submitted',
        );
    }
}
