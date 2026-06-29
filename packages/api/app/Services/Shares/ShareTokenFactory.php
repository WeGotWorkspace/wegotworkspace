<?php

declare(strict_types=1);

namespace App\Services\Shares;

/**
 * High-entropy, URL-safe token generator for share links, email invites, and
 * confirmed-recipient access credentials. Tokens are never logged.
 */
final class ShareTokenFactory
{
    public function generate(): string
    {
        $bytes = (int) config('wgw.shares.token_bytes', 32);
        if ($bytes < 16) {
            $bytes = 16;
        }

        return bin2hex(random_bytes($bytes));
    }
}
