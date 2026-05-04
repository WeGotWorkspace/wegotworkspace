<?php

declare(strict_types=1);

namespace Tests\Api;

use App\Api\ApiDomainHandlers;
use PHPUnit\Framework\TestCase;

final class SettingsProfileApiTest extends TestCase
{
    public function testPutSettingsProfileUpdatesDisplayNameAndEmail(): void
    {
        $pdo = new \PDO('sqlite::memory:');
        $pdo->setAttribute(\PDO::ATTR_ERRMODE, \PDO::ERRMODE_EXCEPTION);
        $pdo->exec('CREATE TABLE principals (id INTEGER PRIMARY KEY AUTOINCREMENT, uri TEXT NOT NULL UNIQUE, email TEXT, displayname TEXT)');
        $pdo->exec('CREATE TABLE groupmembers (principal_id INTEGER NOT NULL, member_id INTEGER NOT NULL)');
        $pdo->exec('CREATE TABLE app_settings (name TEXT PRIMARY KEY, value TEXT NOT NULL)');
        $pdo->exec('CREATE TABLE mail_user_credentials (username TEXT PRIMARY KEY, imap_username TEXT NOT NULL, password_enc TEXT NOT NULL, updated_at INTEGER NOT NULL)');
        $pdo->exec("INSERT INTO principals (uri, email, displayname) VALUES ('principals/alice', 'old@example.test', 'Old Name')");

        $_SERVER['REQUEST_METHOD'] = 'PUT';
        $GLOBALS['__WGW_TEST_JSON_BODY'] = (string) json_encode([
            'displayName' => 'Alice Updated',
            'email' => 'alice.updated@example.test',
        ], JSON_UNESCAPED_SLASHES);

        ob_start();
        $handled = ApiDomainHandlers::dispatch('', 'PUT', 'settings/profile', ['username' => 'alice', 'role' => 'user'], $pdo, 'SabreDAV');
        $raw = (string) ob_get_clean();
        unset($GLOBALS['__WGW_TEST_JSON_BODY']);

        $json = json_decode($raw, true);
        self::assertTrue($handled);
        self::assertIsArray($json);
        self::assertSame('Alice Updated', $json['user']['displayName'] ?? null);
        self::assertSame('alice.updated@example.test', $json['user']['email'] ?? null);

        $stmt = $pdo->prepare('SELECT displayname, email FROM principals WHERE uri = ?');
        $stmt->execute(['principals/alice']);
        $row = $stmt->fetch(\PDO::FETCH_ASSOC);
        self::assertIsArray($row);
        self::assertSame('Alice Updated', $row['displayname'] ?? null);
        self::assertSame('alice.updated@example.test', $row['email'] ?? null);
    }
}
