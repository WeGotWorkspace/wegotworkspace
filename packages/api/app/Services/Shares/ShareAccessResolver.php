<?php

declare(strict_types=1);

namespace App\Services\Shares;

use App\Models\FileShare;
use App\Models\FileShareGrant;

/**
 * Resolves a share link token (plus an optional confirmed-recipient access
 * token) into the effective access for the presented credential.
 *
 * Designed to be the single authorization choke point that a future Sabre/
 * WebDAV auth backend can reuse: it never trusts recipient identity, only the
 * opaque tokens, and it enforces expiry, public access level, and grant status.
 */
final class ShareAccessResolver
{
    /** Permission ranking used to combine public access with a confirmed grant. */
    private const RANK = [
        FileShare::PUBLIC_NONE => 0,
        FileShareGrant::PERMISSION_READ => 1,
        FileShareGrant::PERMISSION_WRITE => 2,
    ];

    /**
     * Locate an active (non-expired) share by its public link token.
     */
    public function findActiveShare(string $token): ?FileShare
    {
        $token = trim($token);
        if ($token === '') {
            return null;
        }

        $share = FileShare::query()->where('token', $token)->first();
        if ($share === null || $share->isExpired()) {
            return null;
        }

        return $share;
    }

    /**
     * Resolve the effective access for the presented credential, or null when
     * the credential grants no access (e.g. private share with no valid token).
     */
    public function resolve(string $token, ?string $accessToken = null): ?ResolvedShareAccess
    {
        $share = $this->findActiveShare($token);
        if ($share === null) {
            return null;
        }

        $permission = $this->effectivePermission($share, $accessToken);
        if ($permission === FileShare::PUBLIC_NONE) {
            return null;
        }

        return new ResolvedShareAccess(
            shareId: (string) $share->id,
            ownerUsername: (string) $share->owner_username,
            targetPath: (string) $share->target_path,
            targetType: (string) $share->target_type,
            permission: $permission,
        );
    }

    /**
     * Effective permission level for the credential: the higher of the share's
     * public access and any confirmed grant tied to the access token.
     *
     * @return 'none'|'read'|'write'
     */
    public function effectivePermission(FileShare $share, ?string $accessToken): string
    {
        $best = (string) $share->public_access;
        if (! isset(self::RANK[$best])) {
            $best = FileShare::PUBLIC_NONE;
        }

        $grant = $this->confirmedGrant($share, $accessToken);
        if ($grant !== null && (self::RANK[$grant->permission] ?? 0) > self::RANK[$best]) {
            $best = $grant->permission;
        }

        return $best;
    }

    public function confirmedGrant(FileShare $share, ?string $accessToken): ?FileShareGrant
    {
        $accessToken = $accessToken !== null ? trim($accessToken) : '';
        if ($accessToken === '') {
            return null;
        }

        return FileShareGrant::query()
            ->where('share_id', $share->id)
            ->where('access_token', $accessToken)
            ->where('status', FileShareGrant::STATUS_CONFIRMED)
            ->first();
    }
}
