<?php

declare(strict_types=1);

namespace App\Services\Shares;

/**
 * Builds the absolute public viewer URLs recipients use. Base URL comes from
 * `wgw.shares.base_url`, falling back to the app URL.
 */
final class ShareLinkBuilder
{
    public function shareLinkUrl(string $token): string
    {
        $base = (string) (config('wgw.shares.base_url') ?: config('app.url') ?: '');

        return rtrim($base, '/').'/s/'.$token;
    }

    public function confirmUrl(string $token, string $inviteToken): string
    {
        return $this->shareLinkUrl($token).'?invite='.rawurlencode($inviteToken);
    }
}
