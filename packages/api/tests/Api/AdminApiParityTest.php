<?php

declare(strict_types=1);

namespace Tests\Api;

use App\Api\ApiDomainHandlers;
use App\Config;
use PHPUnit\Framework\TestCase;

final class AdminApiParityTest extends TestCase
{
    private \PDO $pdo;

    protected function setUp(): void
    {
        parent::setUp();
        $this->pdo = new \PDO('sqlite::memory:');
        $this->pdo->setAttribute(\PDO::ATTR_ERRMODE, \PDO::ERRMODE_EXCEPTION);
        $this->pdo->exec('CREATE TABLE users (id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT NOT NULL UNIQUE, digesta1 TEXT NOT NULL, digest TEXT NOT NULL)');
        $this->pdo->exec('CREATE TABLE principals (id INTEGER PRIMARY KEY AUTOINCREMENT, uri TEXT NOT NULL UNIQUE, email TEXT, displayname TEXT)');
        $this->pdo->exec('CREATE TABLE groupmembers (principal_id INTEGER NOT NULL, member_id INTEGER NOT NULL)');
        $this->pdo->exec('CREATE TABLE app_settings (name TEXT PRIMARY KEY, value TEXT NOT NULL)');
        $this->pdo->exec('CREATE TABLE calendars (id INTEGER PRIMARY KEY AUTOINCREMENT, synctoken INTEGER, components TEXT)');
        $this->pdo->exec('CREATE TABLE calendarinstances (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            calendarid INTEGER,
            uri TEXT,
            principaluri TEXT,
            transparent INTEGER,
            access INTEGER,
            displayname TEXT,
            description TEXT,
            timezone TEXT,
            calendarorder INTEGER,
            calendarcolor TEXT,
            share_href TEXT
        )');
        $this->pdo->exec('CREATE TABLE calendarobjects (id INTEGER PRIMARY KEY AUTOINCREMENT, calendarid INTEGER, uri TEXT)');
        $this->pdo->exec('CREATE TABLE calendarchanges (id INTEGER PRIMARY KEY AUTOINCREMENT, calendarid INTEGER, uri TEXT, synctoken INTEGER, operation INTEGER)');
        $this->pdo->exec('CREATE TABLE addressbooks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            uri TEXT,
            displayname TEXT,
            principaluri TEXT,
            description TEXT,
            synctoken INTEGER
        )');
        $this->pdo->exec('CREATE TABLE cards (id INTEGER PRIMARY KEY AUTOINCREMENT, addressbookid INTEGER, uri TEXT)');
        $this->pdo->exec('CREATE TABLE addressbookchanges (id INTEGER PRIMARY KEY AUTOINCREMENT, addressbookid INTEGER, uri TEXT, synctoken INTEGER, operation INTEGER)');

        $this->pdo->exec("INSERT INTO users (username, digesta1, digest) VALUES ('admin', '', 'hash'), ('alice', '', 'hash')");
        $this->pdo->exec("INSERT INTO principals (uri, email, displayname) VALUES
            ('principals/admin', 'admin@example.test', 'Admin'),
            ('principals/alice', 'alice@example.test', 'Alice'),
            ('principals/groups', NULL, 'Groups'),
            ('principals/groups/administrators', NULL, 'Administrators')");

        $adminPrincipalId = (int) $this->pdo->query("SELECT id FROM principals WHERE uri = 'principals/groups/administrators'")->fetchColumn();
        $adminMemberId = (int) $this->pdo->query("SELECT id FROM principals WHERE uri = 'principals/admin'")->fetchColumn();
        $this->pdo->prepare('INSERT INTO groupmembers (principal_id, member_id) VALUES (?, ?)')->execute([$adminPrincipalId, $adminMemberId]);

        $this->setConfigCacheForUserProvisioning();
    }

    protected function tearDown(): void
    {
        unset($GLOBALS['__WGW_TEST_JSON_BODY']);
        Config::resetCache();
        parent::tearDown();
    }

    public function testAdminStateContainsMembershipMatrixForUi(): void
    {
        $_SERVER['REQUEST_METHOD'] = 'GET';
        ob_start();
        $handled = ApiDomainHandlers::dispatch('', 'GET', 'admin/state', ['username' => 'admin', 'role' => 'admin'], $this->pdo, 'SabreDAV');
        $raw = (string) ob_get_clean();
        $json = json_decode($raw, true);

        self::assertTrue($handled);
        self::assertIsArray($json);
        self::assertSame('admin', $json['currentUser'] ?? null);
        self::assertIsArray($json['users'] ?? null);
        self::assertIsArray($json['groups'] ?? null);

        $admin = null;
        foreach (($json['users'] ?? []) as $user) {
            if (($user['username'] ?? null) === 'admin') {
                $admin = $user;
                break;
            }
        }
        self::assertIsArray($admin);
        self::assertContains('principals/groups/administrators', $admin['groups'] ?? []);
    }

    public function testPatchUserUpdatesGroupMembership(): void
    {
        [$handled, $json] = $this->dispatchJson('PATCH', 'admin/users/alice', [
            'displayName' => 'Alice Updated',
            'email' => 'alice.updated@example.test',
            'groups' => ['principals/groups/administrators'],
        ]);

        self::assertTrue($handled);
        self::assertIsArray($json);
        self::assertSame(true, $json['ok'] ?? null);

        $_SERVER['REQUEST_METHOD'] = 'GET';
        ob_start();
        ApiDomainHandlers::dispatch('', 'GET', 'admin/state', ['username' => 'admin', 'role' => 'admin'], $this->pdo, 'SabreDAV');
        $state = json_decode((string) ob_get_clean(), true);
        $alice = null;
        foreach (($state['users'] ?? []) as $user) {
            if (($user['username'] ?? null) === 'alice') {
                $alice = $user;
                break;
            }
        }

        self::assertIsArray($alice);
        self::assertContains('principals/groups/administrators', $alice['groups'] ?? []);
        self::assertSame('Alice Updated', $alice['displayName'] ?? null);
        self::assertSame('alice.updated@example.test', $alice['email'] ?? null);
    }

    public function testCreateUserAssignsGroupAndDeleteUserRemovesAccount(): void
    {
        [$createdHandled, $createJson] = $this->dispatchJson('POST', 'admin/users', [
            'username' => 'bob',
            'password' => 'strong-password-123',
            'displayName' => 'Bob',
            'email' => 'bob@example.test',
            'groups' => ['principals/groups/administrators'],
        ]);
        self::assertTrue($createdHandled);
        self::assertIsArray($createJson);
        self::assertSame(true, $createJson['ok'] ?? null);

        $userCount = (int) $this->pdo->query("SELECT COUNT(*) FROM users WHERE username = 'bob'")->fetchColumn();
        self::assertSame(1, $userCount);

        $adminGroupId = (int) $this->pdo->query("SELECT id FROM principals WHERE uri = 'principals/groups/administrators'")->fetchColumn();
        $bobPrincipalId = (int) $this->pdo->query("SELECT id FROM principals WHERE uri = 'principals/bob'")->fetchColumn();
        $membershipCount = (int) $this->pdo
            ->query("SELECT COUNT(*) FROM groupmembers WHERE principal_id = {$adminGroupId} AND member_id = {$bobPrincipalId}")
            ->fetchColumn();
        self::assertSame(1, $membershipCount);

        // Exercise DELETE /admin/users/{username} via a user row that does not depend on Cal/Card tables.
        $this->pdo->exec("INSERT INTO users (username, digesta1, digest) VALUES ('orphan', '', 'hash')");
        [$deletedHandled, $deleteJson] = $this->dispatchJson('DELETE', 'admin/users/orphan');
        self::assertTrue($deletedHandled);
        self::assertIsArray($deleteJson);
        self::assertSame(true, $deleteJson['ok'] ?? null);
        $orphanCount = (int) $this->pdo->query("SELECT COUNT(*) FROM users WHERE username = 'orphan'")->fetchColumn();
        self::assertSame(0, $orphanCount);
    }

    public function testDeleteUserWithPrincipalRowCleansPrincipalAndMembership(): void
    {
        [$createHandled, $createJson] = $this->dispatchJson('POST', 'admin/users', [
            'username' => 'carol',
            'password' => 'strong-password-456',
            'displayName' => 'Carol',
            'email' => 'carol@example.test',
            'groups' => ['principals/groups/administrators'],
        ]);
        self::assertTrue($createHandled);
        self::assertIsArray($createJson);
        self::assertSame(true, $createJson['ok'] ?? null);

        $carolPrincipalBefore = (int) $this->pdo
            ->query("SELECT COUNT(*) FROM principals WHERE uri = 'principals/carol'")
            ->fetchColumn();
        self::assertSame(1, $carolPrincipalBefore);

        [$deleteHandled, $deleteJson] = $this->dispatchJson('DELETE', 'admin/users/carol');
        self::assertTrue($deleteHandled);
        self::assertIsArray($deleteJson);
        self::assertSame(true, $deleteJson['ok'] ?? null);

        $carolUserAfter = (int) $this->pdo->query("SELECT COUNT(*) FROM users WHERE username = 'carol'")->fetchColumn();
        $carolPrincipalAfter = (int) $this->pdo
            ->query("SELECT COUNT(*) FROM principals WHERE uri = 'principals/carol'")
            ->fetchColumn();
        self::assertSame(0, $carolUserAfter);
        self::assertSame(0, $carolPrincipalAfter);

        $adminGroupId = (int) $this->pdo->query("SELECT id FROM principals WHERE uri = 'principals/groups/administrators'")->fetchColumn();
        $remainingMemberships = (int) $this->pdo
            ->query("SELECT COUNT(*) FROM groupmembers WHERE principal_id = {$adminGroupId}")
            ->fetchColumn();
        self::assertSame(1, $remainingMemberships, 'Only admin should remain in administrators group.');
    }

    public function testCreateAssignUnassignAndDeleteGroup(): void
    {
        [$groupHandled, $groupJson] = $this->dispatchJson('POST', 'admin/groups', [
            'slug' => 'qa-team',
            'displayName' => 'QA Team',
        ]);
        self::assertTrue($groupHandled);
        self::assertIsArray($groupJson);
        self::assertSame(true, $groupJson['ok'] ?? null);

        $groupExists = (int) $this->pdo
            ->query("SELECT COUNT(*) FROM principals WHERE uri = 'principals/groups/qa-team'")
            ->fetchColumn();
        self::assertSame(1, $groupExists);

        [$addHandled, $addJson] = $this->dispatchJson('PUT', 'admin/groups/qa-team/members/alice', []);
        self::assertTrue($addHandled);
        self::assertIsArray($addJson);
        self::assertSame(true, $addJson['ok'] ?? null);

        $qaGroupId = (int) $this->pdo->query("SELECT id FROM principals WHERE uri = 'principals/groups/qa-team'")->fetchColumn();
        $alicePrincipalId = (int) $this->pdo->query("SELECT id FROM principals WHERE uri = 'principals/alice'")->fetchColumn();
        $addedMembership = (int) $this->pdo
            ->query("SELECT COUNT(*) FROM groupmembers WHERE principal_id = {$qaGroupId} AND member_id = {$alicePrincipalId}")
            ->fetchColumn();
        self::assertSame(1, $addedMembership);

        [$removeHandled, $removeJson] = $this->dispatchJson('DELETE', 'admin/groups/qa-team/members/alice');
        self::assertTrue($removeHandled);
        self::assertIsArray($removeJson);
        self::assertSame(true, $removeJson['ok'] ?? null);
        $removedMembership = (int) $this->pdo
            ->query("SELECT COUNT(*) FROM groupmembers WHERE principal_id = {$qaGroupId} AND member_id = {$alicePrincipalId}")
            ->fetchColumn();
        self::assertSame(0, $removedMembership);

        [$deleteHandled, $deleteJson] = $this->dispatchJson('DELETE', 'admin/groups/qa-team');
        self::assertTrue($deleteHandled);
        self::assertIsArray($deleteJson);
        self::assertSame(true, $deleteJson['ok'] ?? null);
        $groupStillExists = (int) $this->pdo
            ->query("SELECT COUNT(*) FROM principals WHERE uri = 'principals/groups/qa-team'")
            ->fetchColumn();
        self::assertSame(0, $groupStillExists);
    }

    /**
     * @param array<string, mixed>|null $body
     *
     * @return array{0: bool, 1: array<string, mixed>|null}
     */
    private function dispatchJson(string $method, string $route, ?array $body = null): array
    {
        $_SERVER['REQUEST_METHOD'] = $method;
        if ($body !== null) {
            $GLOBALS['__WGW_TEST_JSON_BODY'] = (string) json_encode($body, JSON_UNESCAPED_SLASHES);
        } else {
            unset($GLOBALS['__WGW_TEST_JSON_BODY']);
        }

        ob_start();
        $handled = ApiDomainHandlers::dispatch('', $method, $route, ['username' => 'admin', 'role' => 'admin'], $this->pdo, 'SabreDAV');
        $raw = (string) ob_get_clean();

        return [$handled, json_decode($raw, true)];
    }

    private function setConfigCacheForUserProvisioning(): void
    {
        $setCache = \Closure::bind(static function (array $cache): void {
            Config::$cache = $cache;
        }, null, Config::class);
        \assert($setCache instanceof \Closure);
        $setCache([
            'calendar_enabled' => false,
            'contacts_enabled' => false,
        ]);
    }
}
