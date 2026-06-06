<?php

declare(strict_types=1);

namespace App\Dav\Server;

use App\Services\Admin\AdminConstants;

/**
 * True for {@code principals/{username}} when {@code username} exists in {@code users}
 * and the URI is not the structural groups container.
 */
final class AccountPrincipalFilter
{
    public static function isAccountPrincipalUri(\PDO $pdo, string $uri): bool
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

        $stmt = $pdo->prepare('SELECT 1 FROM users WHERE username = ?');
        $stmt->execute([$rest]);

        return (bool) $stmt->fetchColumn();
    }

    /**
     * @param  array{uri?: string, ...}  $principalInfo
     */
    public static function isAccountPrincipal(\PDO $pdo, array $principalInfo): bool
    {
        return self::isAccountPrincipalUri($pdo, $principalInfo['uri'] ?? '');
    }
}
