<?php

declare(strict_types=1);

namespace Tests\Api;

use App\Api\ApiRefreshStore;
use App\Api\ApiRevocationStore;
use PHPUnit\Framework\TestCase;

final class ApiTokenLifecycleStoreTest extends TestCase
{
    private string $oldDataDir = '';
    private string $tmpDataDir = '';

    protected function setUp(): void
    {
        $old = getenv('SABRE_DATA_DIR');
        $this->oldDataDir = is_string($old) ? $old : '';
        $this->tmpDataDir = sys_get_temp_dir().'/wgw-api-test-'.bin2hex(random_bytes(4));
        putenv('SABRE_DATA_DIR='.$this->tmpDataDir);
    }

    protected function tearDown(): void
    {
        putenv('SABRE_DATA_DIR='.$this->oldDataDir);
        $this->deleteDir($this->tmpDataDir);
    }

    public function testRefreshTokenIssueAndConsume(): void
    {
        $refresh = ApiRefreshStore::issue('alice', 'user');
        self::assertNotSame('', $refresh);

        $principal = ApiRefreshStore::consume($refresh);
        self::assertIsArray($principal);
        self::assertSame('alice', $principal['username']);
        self::assertSame('user', $principal['role']);

        $second = ApiRefreshStore::consume($refresh);
        self::assertNull($second);
    }

    public function testRefreshTokenRevoke(): void
    {
        $refresh = ApiRefreshStore::issue('alice', 'user');
        ApiRefreshStore::revoke($refresh);
        $principal = ApiRefreshStore::consume($refresh);
        self::assertNull($principal);
    }

    public function testRevocationStoreRejectsRevokedJti(): void
    {
        $jti = 'jti-123';
        ApiRevocationStore::revoke($jti, time() + 3600);
        self::assertTrue(ApiRevocationStore::isRevoked($jti));
        self::assertFalse(ApiRevocationStore::isRevoked('other'));
    }

    private function deleteDir(string $dir): void
    {
        if ($dir === '' || !is_dir($dir)) {
            return;
        }
        $items = scandir($dir);
        if (!is_array($items)) {
            return;
        }
        foreach ($items as $item) {
            if ($item === '.' || $item === '..') {
                continue;
            }
            $path = $dir.'/'.$item;
            if (is_dir($path)) {
                $this->deleteDir($path);
            } else {
                @unlink($path);
            }
        }
        @rmdir($dir);
    }
}
