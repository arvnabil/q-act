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

class ChangeRequestDecidedNotification extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public ChangeRequest $changeRequest,
        public Quotation $quotation,
        public User $decidedBy,
        public ?Quotation $newQuotation = null,
    ) {}

    public function envelope(): Envelope
    {
        $statusText = $this->changeRequest->status === 'approved' ? 'DISETUJUI' : 'DITOLAK';
        $typeLabel  = $this->changeRequest->type === 'cancellation' ? 'Pembatalan' : 'Revisi';
        return new Envelope(
            subject: "[Q-Sales] {$statusText}: Pengajuan {$typeLabel} Quotation #{$this->quotation->id}",
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.change-request-decided',
        );
    }
}
