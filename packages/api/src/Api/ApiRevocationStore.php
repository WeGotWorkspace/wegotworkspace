<?php

declare(strict_types=1);

namespace App\Api;

final class ApiRevocationStore
{
    public static function revoke(\PDO $pdo, string $jti, int $exp): void
    {
        self::cleanupExpired($pdo);
        $driver = (string) $pdo->getAttribute(\PDO::ATTR_DRIVER_NAME);
        if ($driver === 'mysql') {
            $stmt = $pdo->prepare(
                'INSERT INTO api_revoked_tokens (jti, expires_at, created_at)
                 VALUES (?, ?, ?)
                 ON DUPLICATE KEY UPDATE expires_at = VALUES(expires_at)'
            );
            $stmt->execute([$jti, $exp, time()]);

            return;
        }
        $stmt = $pdo->prepare(
            'INSERT INTO api_revoked_tokens (jti, expires_at, created_at)
             VALUES (?, ?, ?)
             ON CONFLICT(jti) DO UPDATE SET expires_at = excluded.expires_at'
        );
        $stmt->execute([$jti, $exp, time()]);
    }

    public static function isRevoked(\PDO $pdo, string $jti): bool
    {
        self::cleanupExpired($pdo);
        $stmt = $pdo->prepare('SELECT 1 FROM api_revoked_tokens WHERE jti = ? LIMIT 1');
        $stmt->execute([$jti]);

        return (bool) $stmt->fetchColumn();
    }

    private static function cleanupExpired(\PDO $pdo): void
    {
        $stmt = $pdo->prepare('DELETE FROM api_revoked_tokens WHERE expires_at <= ?');
        $stmt->execute([time()]);
    }
}
