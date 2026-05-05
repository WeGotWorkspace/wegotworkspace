<?php

declare(strict_types=1);

namespace App\Api;

final class ApiRefreshStore
{
    private const TTL_SECONDS = 1209600; // 14 days

    private static function tokenHash(string $token): string
    {
        return hash('sha256', $token);
    }

    /**
     * @param 'guest'|'user'|'admin' $role
     */
    public static function issue(\PDO $pdo, string $username, string $role): string
    {
        $token = bin2hex(random_bytes(32));
        self::cleanupExpired($pdo);
        $hash = self::tokenHash($token);
        $exp = time() + self::TTL_SECONDS;
        $driver = (string) $pdo->getAttribute(\PDO::ATTR_DRIVER_NAME);
        if ($driver === 'mysql') {
            $stmt = $pdo->prepare(
                'INSERT INTO api_refresh_tokens (token_hash, username, role, expires_at, revoked, created_at)
                 VALUES (?, ?, ?, ?, 0, ?)
                 ON DUPLICATE KEY UPDATE
                   username = VALUES(username),
                   role = VALUES(role),
                   expires_at = VALUES(expires_at),
                   revoked = 0'
            );
            $stmt->execute([$hash, $username, $role, $exp, time()]);
        } else {
            $stmt = $pdo->prepare(
                'INSERT INTO api_refresh_tokens (token_hash, username, role, expires_at, revoked, created_at)
                 VALUES (?, ?, ?, ?, 0, ?)
                 ON CONFLICT(token_hash) DO UPDATE SET
                   username = excluded.username,
                   role = excluded.role,
                   expires_at = excluded.expires_at,
                   revoked = 0'
            );
            $stmt->execute([$hash, $username, $role, $exp, time()]);
        }

        return $token;
    }

    /**
     * @return array{username: string, role: 'guest'|'user'|'admin'}|null
     */
    public static function consume(\PDO $pdo, string $token): ?array
    {
        self::cleanupExpired($pdo);
        $hash = self::tokenHash($token);
        $stmt = $pdo->prepare('SELECT username, role, expires_at, revoked FROM api_refresh_tokens WHERE token_hash = ? LIMIT 1');
        $stmt->execute([$hash]);
        $row = $stmt->fetch(\PDO::FETCH_ASSOC);
        if (!is_array($row)) {
            return null;
        }
        $exp = isset($row['expires_at']) && is_numeric($row['expires_at']) ? (int) $row['expires_at'] : 0;
        $revoked = (int) ($row['revoked'] ?? 0);
        if ($revoked === 1 || $exp <= time()) {
            $del = $pdo->prepare('DELETE FROM api_refresh_tokens WHERE token_hash = ?');
            $del->execute([$hash]);

            return null;
        }
        $upd = $pdo->prepare('UPDATE api_refresh_tokens SET revoked = 1 WHERE token_hash = ?');
        $upd->execute([$hash]);

        return [
            'username' => (string) ($row['username'] ?? ''),
            'role' => (string) ($row['role'] ?? ''),
        ];
    }

    public static function revoke(\PDO $pdo, string $token): void
    {
        self::cleanupExpired($pdo);
        $hash = self::tokenHash($token);
        $stmt = $pdo->prepare('UPDATE api_refresh_tokens SET revoked = 1 WHERE token_hash = ?');
        $stmt->execute([$hash]);
    }

    private static function cleanupExpired(\PDO $pdo): void
    {
        $stmt = $pdo->prepare('DELETE FROM api_refresh_tokens WHERE expires_at <= ?');
        $stmt->execute([time()]);
    }
}
