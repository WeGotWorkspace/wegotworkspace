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
        $_GET = [];
        ob_start();
        $handled = ApiDomainHandlers::dispatch('', $method, $route, null, $pdo, 'SabreDAV');
        $raw = (string) ob_get_clean();
        $json = json_decode($raw, true);

        self::assertTrue($handled);
        self::assertIsArray($json);
        self::assertSame('unauthorized', $json['code'] ?? null);
    }

    /**
     * @dataProvider adminOnlyRouteProvider
     */
    public function testAdminRoutesRequireAdminRole(string $method, string $route): void
    {
        $pdo = $this->inMemoryPdo();
        $_SERVER['REQUEST_METHOD'] = $method;
        $_GET = [];
        ob_start();
        $handled = ApiDomainHandlers::dispatch('', $method, $route, ['username' => 'alice', 'role' => 'user'], $pdo, 'SabreDAV');
        $raw = (string) ob_get_clean();
        $json = json_decode($raw, true);

        self::assertTrue($handled);
        self::assertIsArray($json);
        self::assertSame('forbidden', $json['code'] ?? null);
    }

    /**
     * @return iterable<string, array{0:string,1:string}>
     */
    public static function protectedParityRouteProvider(): iterable
    {
        yield 'admin state' => ['GET', 'admin/state'];
        yield 'admin create user' => ['POST', 'admin/users'];
        yield 'admin update user' => ['PATCH', 'admin/users/alice'];
        yield 'admin delete user' => ['DELETE', 'admin/users/alice'];
        yield 'admin create group' => ['POST', 'admin/groups'];
        yield 'admin patch group' => ['PATCH', 'admin/groups/staff'];
        yield 'admin delete group' => ['DELETE', 'admin/groups/staff'];
        yield 'admin settings put' => ['PUT', 'admin/settings'];
        yield 'admin updates state' => ['GET', 'admin/updates/state'];
        yield 'admin updates check' => ['POST', 'admin/updates/check'];
        yield 'admin updates apply' => ['POST', 'admin/updates/apply'];
        yield 'admin updates cancel' => ['POST', 'admin/updates/cancel'];
        yield 'admin updates log get' => ['GET', 'admin/updates/log'];
        yield 'admin updates log delete' => ['DELETE', 'admin/updates/log'];
        yield 'admin backup get' => ['GET', 'admin/updates/backups/snapshot.zip'];
        yield 'admin backup delete' => ['DELETE', 'admin/updates/backups/snapshot.zip'];
        yield 'admin membership add' => ['PUT', 'admin/groups/administrators/members/admin'];
        yield 'admin membership remove' => ['DELETE', 'admin/groups/administrators/members/admin'];

        yield 'settings state' => ['GET', 'settings/state'];
        yield 'settings profile' => ['PUT', 'settings/profile'];
        yield 'settings mail' => ['PUT', 'settings/mail'];

        yield 'mail status' => ['GET', 'mail/status'];
        yield 'mail config get' => ['GET', 'mail/config'];
        yield 'mail config put' => ['PUT', 'mail/config'];
        yield 'mail folders get' => ['GET', 'mail/folders'];
        yield 'mail folders create' => ['POST', 'mail/folders'];
        yield 'mail folders move' => ['PATCH', 'mail/folders'];
        yield 'mail folders delete' => ['DELETE', 'mail/folders'];
        yield 'mail messages' => ['GET', 'mail/messages'];
        yield 'mail messages attachments' => ['GET', 'mail/messages/attachments'];
        yield 'mail message get' => ['GET', 'mail/message'];
        yield 'mail message attachment' => ['GET', 'mail/message/attachment'];
        yield 'mail message patch' => ['PATCH', 'mail/message'];
        yield 'mail move' => ['POST', 'mail/move'];
        yield 'mail send' => ['POST', 'mail/send'];
        yield 'mail draft' => ['POST', 'mail/draft'];

        yield 'drive user' => ['GET', 'drive/user'];
        yield 'drive getdir' => ['POST', 'drive/getdir'];
        yield 'drive search' => ['POST', 'drive/searchfiles'];
        yield 'drive changedir' => ['POST', 'drive/changedir'];
        yield 'drive create' => ['POST', 'drive/createnew'];
        yield 'drive rename' => ['POST', 'drive/renameitem'];
        yield 'drive delete' => ['POST', 'drive/deleteitems'];
        yield 'drive download' => ['GET', 'drive/download'];
        yield 'drive upload' => ['POST', 'drive/upload'];

        yield 'notes state' => ['GET', 'notes/state'];
        yield 'notes capabilities' => ['GET', 'notes/capabilities'];
        yield 'notes list' => ['GET', 'notes/items'];
        yield 'notes create' => ['POST', 'notes/items'];
        yield 'notes upsert' => ['PUT', 'notes/items/n123'];
        yield 'notes delete' => ['DELETE', 'notes/items/n123'];
        yield 'notes archive' => ['POST', 'notes/items/n123/archive'];
        yield 'notes restore' => ['POST', 'notes/items/n123/restore'];
        yield 'notes notebooks list' => ['GET', 'notes/notebooks'];
        yield 'notes notebooks create' => ['POST', 'notes/notebooks'];
        yield 'notes notebook rename' => ['PATCH', 'notes/notebooks/General'];
        yield 'notes notebook delete' => ['DELETE', 'notes/notebooks/General'];

        yield 'office capabilities' => ['GET', 'office/capabilities'];
        yield 'office document create' => ['POST', 'office/documents'];
        yield 'office document update' => ['PUT', 'office/documents'];

        yield 'home state' => ['GET', 'home/state'];
        yield 'dav capabilities' => ['GET', 'dav/capabilities'];
    }

    /**
     * @return iterable<string, array{0:string,1:string}>
     */
    public static function adminOnlyRouteProvider(): iterable
    {
        yield 'admin state' => ['GET', 'admin/state'];
        yield 'admin create user' => ['POST', 'admin/users'];
        yield 'admin update user' => ['PATCH', 'admin/users/alice'];
        yield 'admin delete user' => ['DELETE', 'admin/users/alice'];
        yield 'admin create group' => ['POST', 'admin/groups'];
        yield 'admin patch group' => ['PATCH', 'admin/groups/staff'];
        yield 'admin delete group' => ['DELETE', 'admin/groups/staff'];
        yield 'admin settings put' => ['PUT', 'admin/settings'];
        yield 'admin updates state' => ['GET', 'admin/updates/state'];
        yield 'admin updates check' => ['POST', 'admin/updates/check'];
        yield 'admin updates apply' => ['POST', 'admin/updates/apply'];
        yield 'admin updates cancel' => ['POST', 'admin/updates/cancel'];
        yield 'admin updates log get' => ['GET', 'admin/updates/log'];
        yield 'admin updates log delete' => ['DELETE', 'admin/updates/log'];
        yield 'admin backup get' => ['GET', 'admin/updates/backups/snapshot.zip'];
        yield 'admin backup delete' => ['DELETE', 'admin/updates/backups/snapshot.zip'];
        yield 'admin membership add' => ['PUT', 'admin/groups/administrators/members/admin'];
        yield 'admin membership remove' => ['DELETE', 'admin/groups/administrators/members/admin'];
    }
}
