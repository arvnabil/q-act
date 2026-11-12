<?php

namespace App\Mail;

use App\Models\Customer;
use App\Models\CustomerPic;
use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class CustomerBirthdayReminderNotification extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public CustomerPic $pic,
        public Customer $customer,
        public ?User $salesPic = null,
        public int $daysUntil = 7,
        public ?string $birthdayFormatted = null,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: "[Q-Sales] 🎂 Pengingat Ulang Tahun: {$this->pic->name} ({$this->customer->name}) – H-{$this->daysUntil}",
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.customer-birthday-reminder',
        );
    }
}
