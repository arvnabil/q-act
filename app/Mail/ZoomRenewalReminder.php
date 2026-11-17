<?php

namespace App\Mail;

use App\Models\ZoomSubAccount;
use App\Models\User;
use Carbon\CarbonInterface;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class ZoomRenewalReminder extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public ZoomSubAccount $account,
        public User $salesPic,
        public int $daysBefore,
        public CarbonInterface $renewalDate,
        public array $accountDetails,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(subject: "[Q-Sales] Reminder renewal Zoom H-{$this->daysBefore}: {$this->account->account_name}");
    }

    public function content(): Content
    {
        return new Content(view: 'emails.zoom-renewal-reminder');
    }
}
