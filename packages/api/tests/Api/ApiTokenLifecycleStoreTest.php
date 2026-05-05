<?php

declare(strict_types=1);

namespace Tests\Api;

use App\Api\ApiRefreshStore;
use App\Api\ApiRevocationStore;
use PHPUnit\Framework\TestCase;

final class ApiTokenLifecycleStoreTest extends TestCase
{
    private function pdo(): \PDO
    {
        $pdo = new \PDO('sqlite::memory:');
        $pdo->setAttribute(\PDO::ATTR_ERRMODE, \PDO::ERRMODE_EXCEPTION);
        $pdo->exec(
            'CREATE TABLE api_refresh_tokens (
                token_hash TEXT PRIMARY KEY,
                username TEXT NOT NULL,
                role TEXT NOT NULL,
                expires_at INTEGER NOT NULL,
                revoked INTEGER NOT NULL DEFAULT 0,
                created_at INTEGER NOT NULL
            )'
        );
        $pdo->exec(
            'CREATE TABLE api_revoked_tokens (
                jti TEXT PRIMARY KEY,
                expires_at INTEGER NOT NULL,
                created_at INTEGER NOT NULL
            )'
        );

        return $pdo;
    }

    public function testRefreshTokenIssueAndConsume(): void
    {
        $pdo = $this->pdo();
        $refresh = ApiRefreshStore::issue($pdo, 'alice', 'user');
        self::assertNotSame('', $refresh);

        $principal = ApiRefreshStore::consume($pdo, $refresh);
        self::assertIsArray($principal);
        self::assertSame('alice', $principal['username']);
        self::assertSame('user', $principal['role']);

        $second = ApiRefreshStore::consume($pdo, $refresh);
        self::assertNull($second);
    }

    public function testRefreshTokenRevoke(): void
    {
        $pdo = $this->pdo();
        $refresh = ApiRefreshStore::issue($pdo, 'alice', 'user');
        ApiRefreshStore::revoke($pdo, $refresh);
        $principal = ApiRefreshStore::consume($pdo, $refresh);
        self::assertNull($principal);
    }

    public function testRevocationStoreRejectsRevokedJti(): void
    {
        $pdo = $this->pdo();
        $jti = 'jti-123';
        ApiRevocationStore::revoke($pdo, $jti, time() + 3600);
        self::assertTrue(ApiRevocationStore::isRevoked($pdo, $jti));
        self::assertFalse(ApiRevocationStore::isRevoked($pdo, 'other'));
    }
}
