<?php

declare(strict_types=1);

namespace Tests\Api;

use App\Api\ApiDomainHandlers;
use PHPUnit\Framework\TestCase;

final class OfficeDocumentsApiTest extends TestCase
{
    private string $tmpDataDir;
    private ?string $previousSabreDataDir = null;
    private \PDO $pdo;

    protected function setUp(): void
    {
        parent::setUp();

        $this->previousSabreDataDir = getenv('SABRE_DATA_DIR') === false ? null : (string) getenv('SABRE_DATA_DIR');
        $this->tmpDataDir = sys_get_temp_dir().'/wgw-office-api-test-'.bin2hex(random_bytes(6));
        @mkdir($this->tmpDataDir.'/files/users/alice', 0775, true);
        putenv('SABRE_DATA_DIR='.$this->tmpDataDir);

        $this->pdo = new \PDO('sqlite::memory:');
        $this->pdo->setAttribute(\PDO::ATTR_ERRMODE, \PDO::ERRMODE_EXCEPTION);
        $this->pdo->exec('CREATE TABLE principals (id INTEGER PRIMARY KEY AUTOINCREMENT, uri TEXT NOT NULL, displayname TEXT)');
        $this->pdo->exec('CREATE TABLE groupmembers (principal_id INTEGER NOT NULL, member_id INTEGER NOT NULL)');
        $this->pdo->exec("INSERT INTO principals (id, uri, displayname) VALUES (1, 'principals/alice', 'Alice')");
    }

    protected function tearDown(): void
    {
        unset($GLOBALS['__WGW_TEST_JSON_BODY']);
        $_SERVER = [];
        $_GET = [];
        $_POST = [];
        $_FILES = [];

        if ($this->previousSabreDataDir === null) {
            putenv('SABRE_DATA_DIR');
        } else {
            putenv('SABRE_DATA_DIR='.$this->previousSabreDataDir);
        }

        $this->rmRecursive($this->tmpDataDir);
        parent::tearDown();
    }

    public function testOfficeDocumentCreateAndUpdateViaApi(): void
    {
        $_SERVER['REQUEST_METHOD'] = 'POST';
        $GLOBALS['__WGW_TEST_JSON_BODY'] = (string) json_encode([
            'path' => '/users/alice/Test.docx',
        ], JSON_UNESCAPED_SLASHES);
        ob_start();
        $handledCreate = ApiDomainHandlers::dispatch('', 'POST', 'office/documents', ['username' => 'alice', 'role' => 'user'], $this->pdo, 'SabreDAV');
        $rawCreate = (string) ob_get_clean();
        $create = json_decode($rawCreate, true);

        self::assertTrue($handledCreate);
        self::assertIsArray($create);
        self::assertSame(true, $create['ok'] ?? null);
        self::assertFileExists($this->tmpDataDir.'/files/users/alice/Test.docx');

        $_SERVER['REQUEST_METHOD'] = 'PUT';
        $payload = 'PK'.str_repeat('A', 32);
        $GLOBALS['__WGW_TEST_JSON_BODY'] = (string) json_encode([
            'path' => '/users/alice/Test.docx',
            'content_base64' => base64_encode($payload),
        ], JSON_UNESCAPED_SLASHES);
        ob_start();
        $handledUpdate = ApiDomainHandlers::dispatch('', 'PUT', 'office/documents', ['username' => 'alice', 'role' => 'user'], $this->pdo, 'SabreDAV');
        $rawUpdate = (string) ob_get_clean();
        $update = json_decode($rawUpdate, true);

        self::assertTrue($handledUpdate);
        self::assertIsArray($update);
        self::assertSame(true, $update['ok'] ?? null);
        self::assertSame('/users/alice/Test.docx', $update['path'] ?? null);
        self::assertSame(strlen($payload), $update['bytes'] ?? null);
        self::assertSame($payload, (string) file_get_contents($this->tmpDataDir.'/files/users/alice/Test.docx'));
    }

    private function rmRecursive(string $path): void
    {
        if (is_file($path) || is_link($path)) {
            @unlink($path);

            return;
        }
        if (!is_dir($path)) {
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
            $this->rmRecursive($path.'/'.$item);
        }
        @rmdir($path);
    }
}
