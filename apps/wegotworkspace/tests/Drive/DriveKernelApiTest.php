<?php

declare(strict_types=1);

namespace Tests\Drive;

use App\Drive\DriveKernel;
use PHPUnit\Framework\TestCase;

final class DriveKernelApiTest extends TestCase
{
    private string $tmpDataDir;
    private \PDO $pdo;
    private ?string $previousSabreDataDir = null;

    protected function setUp(): void
    {
        parent::setUp();

        $this->previousSabreDataDir = getenv('SABRE_DATA_DIR') === false ? null : (string) getenv('SABRE_DATA_DIR');
        $this->tmpDataDir = sys_get_temp_dir().'/wgw-drive-test-'.bin2hex(random_bytes(6));
        @mkdir($this->tmpDataDir.'/files/users/alice', 0775, true);
        @mkdir($this->tmpDataDir.'/files/users/bob', 0775, true);
        @mkdir($this->tmpDataDir.'/files/groups/engineering', 0775, true);
        @mkdir($this->tmpDataDir.'/files/groups/finance', 0775, true);
        file_put_contents($this->tmpDataDir.'/files/users/alice/readme.txt', 'hello alice');
        file_put_contents($this->tmpDataDir.'/files/groups/engineering/plan-secret.txt', 'roadmap');
        file_put_contents($this->tmpDataDir.'/files/groups/finance/secret.txt', 'finance-only');
        putenv('SABRE_DATA_DIR='.$this->tmpDataDir);

        $this->pdo = new \PDO('sqlite::memory:');
        $this->pdo->setAttribute(\PDO::ATTR_ERRMODE, \PDO::ERRMODE_EXCEPTION);
        $this->pdo->exec('CREATE TABLE principals (id INTEGER PRIMARY KEY AUTOINCREMENT, uri TEXT NOT NULL, displayname TEXT)');
        $this->pdo->exec('CREATE TABLE groupmembers (principal_id INTEGER NOT NULL, member_id INTEGER NOT NULL)');
        $this->pdo->exec("INSERT INTO principals (id, uri, displayname) VALUES (1, 'principals/alice', 'Alice'), (2, 'principals/bob', 'Bob'), (3, 'principals/groups/engineering', 'Engineering'), (4, 'principals/groups/finance', 'Finance')");
        $this->pdo->exec('INSERT INTO groupmembers (principal_id, member_id) VALUES (3, 1)');

        if (session_status() === \PHP_SESSION_ACTIVE) {
            session_unset();
            session_write_close();
        }
        $_SESSION = [];
    }

    protected function tearDown(): void
    {
        unset($GLOBALS['__WGW_TEST_JSON_BODY']);
        $_GET = [];
        $_POST = [];
        $_FILES = [];
        $_SERVER = [];

        if (session_status() === \PHP_SESSION_ACTIVE) {
            session_unset();
            session_write_close();
        }
        $_SESSION = [];

        if ($this->previousSabreDataDir === null) {
            putenv('SABRE_DATA_DIR');
        } else {
            putenv('SABRE_DATA_DIR='.$this->previousSabreDataDir);
        }

        $this->rmRecursive($this->tmpDataDir);
        parent::tearDown();
    }

    public function testCreateRenameDeleteDirectoryAndFileInOwnSpace(): void
    {
        $this->callDrive('/changedir', 'POST', ['to' => '/users/alice']);

        $createdDir = $this->callDrive('/createnew', 'POST', ['name' => 'Projects', 'type' => 'dir']);
        self::assertSame('Created', $createdDir['data'] ?? null);
        self::assertDirectoryExists($this->tmpDataDir.'/files/users/alice/Projects');

        $createdFile = $this->callDrive('/createnew', 'POST', ['name' => 'todo.txt', 'type' => 'file']);
        self::assertSame('Created', $createdFile['data'] ?? null);
        self::assertFileExists($this->tmpDataDir.'/files/users/alice/todo.txt');

        $renamedDir = $this->callDrive('/renameitem', 'POST', ['destination' => '/users/alice', 'from' => 'Projects', 'to' => 'Projects-2026']);
        self::assertSame('Renamed', $renamedDir['data'] ?? null);
        self::assertDirectoryExists($this->tmpDataDir.'/files/users/alice/Projects-2026');

        $renamedFile = $this->callDrive('/renameitem', 'POST', ['destination' => '/users/alice', 'from' => 'todo.txt', 'to' => 'todo-renamed.txt']);
        self::assertSame('Renamed', $renamedFile['data'] ?? null);
        self::assertFileExists($this->tmpDataDir.'/files/users/alice/todo-renamed.txt');

        $deleted = $this->callDrive('/deleteitems', 'POST', ['items' => [['path' => '/users/alice/Projects-2026'], ['path' => '/users/alice/todo-renamed.txt']]]);
        self::assertSame('Deleted', $deleted['data'] ?? null);
        self::assertDirectoryDoesNotExist($this->tmpDataDir.'/files/users/alice/Projects-2026');
        self::assertFileDoesNotExist($this->tmpDataDir.'/files/users/alice/todo-renamed.txt');
    }

    public function testAccessMatrixForUserAndGroupDirectories(): void
    {
        $own = $this->callDrive('/getdir', 'POST', ['dir' => '/users/alice']);
        self::assertSame('/users/alice/', $own['data']['location'] ?? null);

        $otherUser = $this->callDrive('/getdir', 'POST', ['dir' => '/users/bob']);
        self::assertSame('Access denied for this path.', $otherUser['data'] ?? null);

        $ownGroup = $this->callDrive('/getdir', 'POST', ['dir' => '/groups/engineering']);
        self::assertSame('/groups/engineering/', $ownGroup['data']['location'] ?? null);

        $otherGroup = $this->callDrive('/getdir', 'POST', ['dir' => '/groups/finance']);
        self::assertSame('Access denied for this path.', $otherGroup['data'] ?? null);
    }

    public function testSearchDownloadAndUploadEdgeCases(): void
    {
        $search = $this->callDrive('/searchfiles', 'POST', ['q' => 'secret', 'limit' => 25]);
        $paths = array_map(
            static fn (array $entry): string => (string) ($entry['path'] ?? ''),
            is_array($search['data']['files'] ?? null) ? $search['data']['files'] : []
        );
        self::assertContains('/groups/engineering/plan-secret.txt', $paths);
        self::assertNotContains('/groups/finance/secret.txt', $paths);

        $downloadAllowed = $this->callDriveRaw('/download', 'GET', null, ['path' => base64_encode('/users/alice/readme.txt')]);
        self::assertSame('hello alice', $downloadAllowed);

        $downloadDenied = $this->callDrive('/download', 'GET', null, ['path' => base64_encode('/groups/finance/secret.txt')]);
        self::assertSame('Access denied for this path.', $downloadDenied['data'] ?? null);

        $uploadHealth = $this->callDriveRaw('/upload', 'GET');
        self::assertSame('OK', $uploadHealth);

        $uploadInvalid = $this->callDrive('/upload', 'POST', null);
        self::assertSame('Missing upload file.', $uploadInvalid['data'] ?? null);
    }

    public function testCreateAndRenameConflictErrors(): void
    {
        $this->callDrive('/changedir', 'POST', ['to' => '/users/alice']);

        $createExisting = $this->callDrive('/createnew', 'POST', ['name' => 'readme.txt', 'type' => 'file']);
        self::assertSame('Item already exists.', $createExisting['data'] ?? null);

        $this->callDrive('/createnew', 'POST', ['name' => 'source.txt', 'type' => 'file']);
        $this->callDrive('/createnew', 'POST', ['name' => 'target.txt', 'type' => 'file']);

        $renameConflict = $this->callDrive('/renameitem', 'POST', [
            'destination' => '/users/alice',
            'from' => 'source.txt',
            'to' => 'target.txt',
        ]);
        self::assertSame('Destination already exists.', $renameConflict['data'] ?? null);
        self::assertFileExists($this->tmpDataDir.'/files/users/alice/source.txt');
        self::assertFileExists($this->tmpDataDir.'/files/users/alice/target.txt');
    }

    public function testDeleteMixedAllowedAndDeniedItemsReturnsErrorWithPartialDeletion(): void
    {
        file_put_contents($this->tmpDataDir.'/files/users/alice/remove-me.txt', 'tmp');
        self::assertFileExists($this->tmpDataDir.'/files/users/alice/remove-me.txt');
        self::assertFileExists($this->tmpDataDir.'/files/groups/finance/secret.txt');

        $deleteMixed = $this->callDrive('/deleteitems', 'POST', [
            'items' => [
                ['path' => '/users/alice/remove-me.txt'],
                ['path' => '/groups/finance/secret.txt'],
            ],
        ]);
        self::assertSame('Access denied for this path.', $deleteMixed['data'] ?? null);
        self::assertFileDoesNotExist($this->tmpDataDir.'/files/users/alice/remove-me.txt');
        self::assertFileExists($this->tmpDataDir.'/files/groups/finance/secret.txt');
    }

    /**
     * @param array<string,mixed>|null $body
     * @param array<string,string> $query
     * @return array<string,mixed>
     */
    private function callDrive(string $route, string $method, ?array $body = null, array $query = []): array
    {
        $raw = $this->callDriveRaw($route, $method, $body, $query);
        $decoded = json_decode($raw, true);
        self::assertIsArray($decoded, 'Expected JSON response for '.$route);

        return $decoded;
    }

    /**
     * @param array<string,mixed>|null $body
     * @param array<string,string> $query
     */
    private function callDriveRaw(string $route, string $method, ?array $body = null, array $query = []): string
    {
        $_SERVER['REQUEST_METHOD'] = strtoupper($method);
        $_GET = $query;
        $_POST = [];
        $_FILES = [];
        if ($body === null) {
            unset($GLOBALS['__WGW_TEST_JSON_BODY']);
        } else {
            $GLOBALS['__WGW_TEST_JSON_BODY'] = (string) json_encode($body, JSON_UNESCAPED_SLASHES);
        }

        ob_start();
        DriveKernel::respondApiFromToken('', $this->pdo, 'alice', $route);

        return (string) ob_get_clean();
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
