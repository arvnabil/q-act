<?php

namespace App\Mail;

use App\Models\Lead;
use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class LeadAssignedNotification extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public Lead $lead,
        public User $assignedSales,
        public ?User $assignedBy = null,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: "[Q-Sales] Disposisi Prospek Baru: {$this->lead->title} (" . ($this->lead->lead_code ?? 'Lead') . ")",
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.lead-assigned',
        );
    }
}
