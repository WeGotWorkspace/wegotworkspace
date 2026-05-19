<?php

declare(strict_types=1);

namespace App\Services\Mail;

use App\Models\Principal;

final class MailPrincipalIdentityService
{
    /**
     * @return array{displayName: string, emailAddress: string}
     */
    public static function fetch(string $username): array
    {
        $principal = Principal::forUsername($username);
        if ($principal === null) {
            return ['displayName' => $username, 'emailAddress' => ''];
        }

        $email = trim((string) ($principal->email ?? ''));
        $display = trim((string) ($principal->displayname ?? ''));

        return [
            'displayName' => $display !== '' ? $display : $username,
            'emailAddress' => $email,
        ];
    }
}
