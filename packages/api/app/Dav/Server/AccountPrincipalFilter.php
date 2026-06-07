<?php

declare(strict_types=1);

namespace App\Dav\Server;

use App\Models\User;
use App\Services\Admin\AdminConstants;

/**
 * True for {@code principals/{username}} when {@code username} exists in {@code users}
 * and the URI is not the structural groups container.
 */
final class AccountPrincipalFilter
{
    public static function isAccountPrincipalUri(string $uri): bool
    {
        if ($uri === AdminConstants::GROUP_CONTAINER_URI) {
            return false;
        }
        if (! str_starts_with($uri, 'principals/')) {
            return false;
        }
        $rest = substr($uri, strlen('principals/'));
        if ($rest === '' || str_contains($rest, '/')) {
            return false;
        }

        return User::query()->where('username', $rest)->exists();
    }

    /**
     * @param  array{uri?: string, ...}  $principalInfo
     */
    public static function isAccountPrincipal(array $principalInfo): bool
    {
        return self::isAccountPrincipalUri($principalInfo['uri'] ?? '');
    }
}
