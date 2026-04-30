<?php

declare(strict_types=1);

namespace Tests\Api;

use App\Api\ApiDomainHandlers;
use PHPUnit\Framework\TestCase;

final class ApiDomainHandlersTest extends TestCase
{
    private function inMemoryPdo(): \PDO
    {
        $pdo = new \PDO('sqlite::memory:');
        $pdo->setAttribute(\PDO::ATTR_ERRMODE, \PDO::ERRMODE_EXCEPTION);

        return $pdo;
    }

    public function testInstallerStateWorksForGuest(): void
    {
        $pdo = $this->inMemoryPdo();
        $_SERVER['REQUEST_METHOD'] = 'GET';
        ob_start();
        $handled = ApiDomainHandlers::dispatch('', 'GET', 'installer/state', null, $pdo, 'SabreDAV');
        $raw = (string) ob_get_clean();
        $json = json_decode($raw, true);

        self::assertTrue($handled);
        self::assertIsArray($json);
        self::assertArrayHasKey('installed', $json);
        self::assertArrayHasKey('maintenance', $json);
    }

    public function testProtectedDomainRequiresToken(): void
    {
        $pdo = $this->inMemoryPdo();
        $_SERVER['REQUEST_METHOD'] = 'GET';
        ob_start();
        $handled = ApiDomainHandlers::dispatch('', 'GET', 'settings/state', null, $pdo, 'SabreDAV');
        $raw = (string) ob_get_clean();
        $json = json_decode($raw, true);

        self::assertTrue($handled);
        self::assertIsArray($json);
        self::assertSame('unauthorized', $json['code'] ?? null);
    }
}
