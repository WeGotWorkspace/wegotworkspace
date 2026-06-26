<?php

declare(strict_types=1);

namespace App\Services\Shares;

use App\Mail\ShareInviteMail;
use App\Models\FileShare;
use App\Models\FileShareGrant;
use App\Models\Principal;
use Illuminate\Support\Facades\Mail;

/**
 * Sends the email-confirmation invite for a pending share grant. Uses the Mail
 * facade so delivery is interceptable via Mail::fake() in tests.
 */
final class ShareInviteSender
{
    public function __construct(private ShareLinkBuilder $links) {}

    public function send(FileShare $share, FileShareGrant $grant): void
    {
        $ownerName = (string) (Principal::forUsername((string) $share->owner_username)?->displayname
            ?: $share->owner_username);

        Mail::to((string) $grant->email)->send(new ShareInviteMail(
            confirmUrl: $this->links->confirmUrl((string) $share->token, (string) $grant->invite_token),
            shareName: basename((string) $share->target_path),
            ownerName: $ownerName,
            permission: (string) $grant->permission,
        ));
    }
}
