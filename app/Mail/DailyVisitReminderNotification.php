<?php

namespace App\Mail;

use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Collection;

class DailyVisitReminderNotification extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public User $sales,
        public Collection $visits,
        public string $dateFormatted,
    ) {}

    public function envelope(): Envelope
    {
        $count = $this->visits->count();
        return new Envelope(
            subject: "[Q-Sales] Agenda Kunjungan Anda Hari Ini: {$count} Agenda ({$this->dateFormatted})",
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.daily-visit-reminder',
        );
    }
}
