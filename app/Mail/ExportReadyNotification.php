<?php

namespace App\Mail;

use App\Models\ExportJob;
use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Attachment;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Storage;

class ExportReadyNotification extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public ExportJob $exportJob,
        public User $recipient,
        public string $downloadUrl,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: '[Q-Sales] Berkas Ekspor Siap Diunduh – ' . $this->exportJob->title,
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.export-ready',
        );
    }

    /**
     * Attach the zip file directly if smaller than 15MB, otherwise provide the download link.
     */
    public function attachments(): array
    {
        $maxAttachmentBytes = 15 * 1024 * 1024; // 15 MB
        if ($this->exportJob->file_path && Storage::exists($this->exportJob->file_path)) {
            $fullPath = Storage::path($this->exportJob->file_path);
            if (file_exists($fullPath) && filesize($fullPath) <= $maxAttachmentBytes) {
                return [
                    Attachment::fromPath($fullPath)
                        ->as($this->exportJob->file_name ?: 'Sales_Orders_Export.zip')
                        ->withMime('application/zip'),
                ];
            }
        }
        return [];
    }
}
