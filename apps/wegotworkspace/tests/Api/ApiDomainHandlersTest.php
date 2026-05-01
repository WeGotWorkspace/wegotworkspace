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
        self::assertArrayHasKey('state', $json);
    }

    public function testInstallerBootstrapWorksForGuest(): void
    {
        $pdo = $this->inMemoryPdo();
        $_SERVER['REQUEST_METHOD'] = 'GET';
        ob_start();
        $handled = ApiDomainHandlers::dispatch('', 'GET', 'installer/bootstrap', null, $pdo, 'SabreDAV');
        $raw = (string) ob_get_clean();
        $json = json_decode($raw, true);

        self::assertTrue($handled);
        self::assertIsArray($json);
        self::assertArrayHasKey('csrf', $json);
        self::assertArrayHasKey('state', $json);
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

    public function testInstallerActionAcceptsGuestRequests(): void
    {
        $pdo = $this->inMemoryPdo();
        $_SERVER['REQUEST_METHOD'] = 'POST';
        ob_start();
        $handled = ApiDomainHandlers::dispatch('', 'POST', 'installer/action', null, $pdo, 'SabreDAV');
        $raw = (string) ob_get_clean();
        $json = json_decode($raw, true);

        self::assertTrue($handled);
        self::assertIsArray($json);
        self::assertSame(false, $json['ok'] ?? null);
        self::assertContains($json['error'] ?? null, ['Unsupported action', 'This instance is already installed.']);
    }

    /**
     * @dataProvider protectedParityRouteProvider
     */
    public function testParityRoutesRequireToken(string $method, string $route): void
    {
        $pdo = $this->inMemoryPdo();
        $_SERVER['REQUEST_METHOD'] = $method;
        ob_start();
        $handled = ApiDomainHandlers::dispatch('', $method, $route, null, $pdo, 'SabreDAV');
        $raw = (string) ob_get_clean();
        $json = json_decode($raw, true);

        self::assertTrue($handled);
        self::assertIsArray($json);
        self::assertSame('unauthorized', $json['code'] ?? null);
    }

    /**
     * @return iterable<string, array{0:string,1:string}>
     */
    public static function protectedParityRouteProvider(): iterable
    {
        yield 'mail folders' => ['GET', 'mail/folders'];
        yield 'mail message' => ['GET', 'mail/message'];
        yield 'drive getdir' => ['POST', 'drive/getdir'];
        yield 'drive upload' => ['POST', 'drive/upload'];
        yield 'notes state' => ['GET', 'notes/state'];
        yield 'notes list' => ['GET', 'notes/items'];
        yield 'notes archive' => ['POST', 'notes/items/n123/archive'];
        yield 'notes notebooks list' => ['GET', 'notes/notebooks'];
        yield 'notes notebook rename' => ['PATCH', 'notes/notebooks/General'];
        yield 'office document create' => ['POST', 'office/documents'];
        yield 'office document update' => ['PUT', 'office/documents'];
        yield 'admin log' => ['GET', 'admin/updates/log'];
        yield 'admin backup delete' => ['DELETE', 'admin/updates/backups/snapshot.zip'];
        yield 'admin membership add' => ['PUT', 'admin/groups/administrators/members/admin'];
    }
}
