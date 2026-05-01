<?php

declare(strict_types=1);

namespace Tests\Api;

use App\Api\ApiDomainHandlers;
use App\Config;
use PHPUnit\Framework\TestCase;

final class MailApiBehaviorTest extends TestCase
{
    private \PDO $pdo;
    private string $tempDataDir;

    protected function setUp(): void
    {
        parent::setUp();
        $this->pdo = new \PDO('sqlite::memory:');
        $this->pdo->setAttribute(\PDO::ATTR_ERRMODE, \PDO::ERRMODE_EXCEPTION);
        $this->pdo->exec('CREATE TABLE principals (id INTEGER PRIMARY KEY AUTOINCREMENT, uri TEXT NOT NULL UNIQUE, email TEXT, displayname TEXT)');
        $this->pdo->exec('CREATE TABLE mail_user_credentials (
            username TEXT PRIMARY KEY,
            imap_username TEXT NOT NULL,
            password_enc TEXT NOT NULL,
            updated_at INTEGER NOT NULL DEFAULT 0
        )');
        $this->pdo->exec("INSERT INTO principals (uri, email, displayname) VALUES ('principals/alice', 'alice@example.test', 'Alice')");

        $this->tempDataDir = sys_get_temp_dir().'/wgw-mail-api-test-'.bin2hex(random_bytes(6));
        @mkdir($this->tempDataDir, 0775, true);
        putenv('SABRE_DATA_DIR='.$this->tempDataDir);

        $this->setConfigCacheForMail();
    }

    protected function tearDown(): void
    {
        unset($GLOBALS['__WGW_TEST_JSON_BODY']);
        Config::resetCache();
        putenv('SABRE_DATA_DIR');
        $this->removeDirRecursive($this->tempDataDir);
        parent::tearDown();
    }

    public function testMailStatusAndConfigReportUnconfiguredAccount(): void
    {
        [$statusHandled, $status] = $this->dispatchJson('GET', 'mail/status');
        self::assertTrue($statusHandled);
        self::assertIsArray($status);
        self::assertSame(true, $status['serversConfigured'] ?? null);
        self::assertSame(false, $status['accountConfigured'] ?? null);
        self::assertSame(false, $status['configured'] ?? null);
        self::assertSame(false, $status['ready'] ?? null);

        [$configHandled, $config] = $this->dispatchJson('GET', 'mail/config');
        self::assertTrue($configHandled);
        self::assertIsArray($config);
        self::assertSame('Alice', $config['config']['identity']['displayName'] ?? null);
        self::assertSame('alice@example.test', $config['config']['identity']['emailAddress'] ?? null);
        self::assertSame('', $config['config']['account']['imapUsername'] ?? null);
        self::assertSame(false, $config['config']['account']['imapHasPassword'] ?? null);
    }

    public function testMailConfigPutStoresEncryptedCredentialsAndStatusReflectsIt(): void
    {
        [$putHandled, $put] = $this->dispatchJson('PUT', 'mail/config', [
            'imap' => [
                'username' => 'alice@example.test',
                'password' => 'mail-secret-123',
            ],
        ]);
        self::assertTrue($putHandled);
        self::assertIsArray($put);
        self::assertSame(true, $put['ok'] ?? null);
        self::assertSame('alice@example.test', $put['config']['account']['imapUsername'] ?? null);
        self::assertSame(true, $put['config']['account']['imapHasPassword'] ?? null);

        $row = $this->pdo->query("SELECT imap_username, password_enc FROM mail_user_credentials WHERE username = 'alice'")->fetch(\PDO::FETCH_ASSOC);
        self::assertIsArray($row);
        self::assertSame('alice@example.test', $row['imap_username'] ?? null);
        self::assertIsString($row['password_enc'] ?? null);
        self::assertNotSame('', trim((string) ($row['password_enc'] ?? '')));
        self::assertNotSame('mail-secret-123', $row['password_enc'] ?? null);

        [$statusHandled, $status] = $this->dispatchJson('GET', 'mail/status');
        self::assertTrue($statusHandled);
        self::assertIsArray($status);
        self::assertSame(true, $status['serversConfigured'] ?? null);
        self::assertSame(true, $status['accountConfigured'] ?? null);
        self::assertSame(true, $status['configured'] ?? null);
        self::assertSame((bool) ($status['extImap'] ?? false), $status['ready'] ?? null);
    }

    public function testMailConfigPutSupportsUnchangedPasswordSentinel(): void
    {
        [$firstHandled, $first] = $this->dispatchJson('PUT', 'mail/config', [
            'imap' => [
                'username' => 'alice@example.test',
                'password' => 'mail-secret-123',
            ],
        ]);
        self::assertTrue($firstHandled);
        self::assertIsArray($first);
        self::assertSame(true, $first['ok'] ?? null);

        [$secondHandled, $second] = $this->dispatchJson('PUT', 'mail/config', [
            'imap' => [
                'username' => 'alias@example.test',
                'password' => '__unchanged__',
            ],
        ]);
        self::assertTrue($secondHandled);
        self::assertIsArray($second);
        self::assertSame(true, $second['ok'] ?? null);
        self::assertSame('alias@example.test', $second['config']['account']['imapUsername'] ?? null);
        self::assertSame(true, $second['config']['account']['imapHasPassword'] ?? null);
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
        $handled = ApiDomainHandlers::dispatch('', $method, $route, ['username' => 'alice', 'role' => 'user'], $this->pdo, 'SabreDAV');
        $raw = (string) ob_get_clean();

        return [$handled, json_decode($raw, true)];
    }

    private function setConfigCacheForMail(): void
    {
        $setCache = \Closure::bind(static function (array $cache): void {
            Config::$cache = $cache;
        }, null, Config::class);
        \assert($setCache instanceof \Closure);
        $setCache([
            'mail_imap_host' => 'imap.example.test',
            'mail_imap_port' => 993,
            'mail_imap_security' => 'ssl',
            'mail_smtp_host' => 'smtp.example.test',
            'mail_smtp_port' => 465,
            'mail_smtp_security' => 'ssl',
        ]);
    }

    private function removeDirRecursive(string $path): void
    {
        if ($path === '' || !is_dir($path)) {
            return;
        }
        $items = scandir($path);
        if (!is_array($items)) {
            return;
        }
        foreach ($items as $item) {
            if ($item === '.' || $item === '..') {
                continue;
            }
            $full = $path.'/'.$item;
            if (is_dir($full)) {
                $this->removeDirRecursive($full);
            } else {
                @unlink($full);
            }
        }
        @rmdir($path);
    }
}
