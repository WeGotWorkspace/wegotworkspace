<?php

declare(strict_types=1);

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

/**
 * Invite a non-team recipient to confirm access to a shared file or folder.
 * The confirm link carries the opaque invite token; tokens are never logged.
 */
final class ShareInviteMail extends Mailable
{
    use Queueable;
    use SerializesModels;

    public function __construct(
        public string $confirmUrl,
        public string $shareName,
        public string $ownerName,
        public string $permission,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: $this->ownerName.' shared "'.$this->shareName.'" with you',
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'mail.share-invite',
            with: [
                'confirmUrl' => $this->confirmUrl,
                'shareName' => $this->shareName,
                'ownerName' => $this->ownerName,
                'canWrite' => $this->permission === 'write',
            ],
        );
    }
}
