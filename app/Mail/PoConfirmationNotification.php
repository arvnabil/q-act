<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class PoConfirmationNotification extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public array $data
    ) {}

    public function envelope(): Envelope
    {
        $customer = $this->data['customerName'] ?? 'Customer';
        $poNum = $this->data['poNumber'] ?? 'PO';
        $quotId = $this->data['quotationId'] ?? '';

        return new Envelope(
            subject: "[QSales][PO Masuk] {$customer} - {$poNum} ({$quotId})"
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.po_confirmation',
            with: $this->data
        );
    }
}
