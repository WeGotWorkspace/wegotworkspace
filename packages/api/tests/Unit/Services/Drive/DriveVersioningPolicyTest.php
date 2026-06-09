<?php

declare(strict_types=1);

namespace Tests\Unit\Services\Drive;

use App\Services\Drive\DriveVersioningPolicy;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

final class DriveVersioningPolicyTest extends TestCase
{
    private string $tempDir;

    private DriveVersioningPolicy $policy;

    private static bool $finfoAvailable;

    public static function setUpBeforeClass(): void
    {
        self::$finfoAvailable = function_exists('finfo_open');
    }

    protected function setUp(): void
    {
        parent::setUp();

        $this->tempDir = sys_get_temp_dir().'/wgw-version-policy-'.uniqid('', true);
        mkdir($this->tempDir, 0775, true);

        config([
            'wgw.git_versioning.max_bytes' => 8 * 1024 * 1024,
        ]);

        $this->policy = new DriveVersioningPolicy;
    }

    protected function tearDown(): void
    {
        $this->removeTree($this->tempDir);
        parent::tearDown();
    }

    #[Test]
    public function should_version_text_file_under_limit(): void
    {
        $path = $this->writeFile('hello.txt', str_repeat('a', 1024));

        $this->assertTrue($this->policy->shouldVersion($path, 'users/alice/hello.txt'));
    }

    #[Test]
    public function should_not_version_missing_file(): void
    {
        $this->assertFalse($this->policy->shouldVersion($this->tempDir.'/missing.txt', 'users/alice/missing.txt'));
    }

    #[Test]
    public function should_not_version_file_over_max_bytes(): void
    {
        $path = $this->writeFile('large.txt', str_repeat('x', (8 * 1024 * 1024) + 1));

        $this->assertFalse($this->policy->shouldVersion($path, 'users/alice/large.txt'));
    }

    #[Test]
    public function should_not_version_binary_file_with_null_bytes(): void
    {
        $path = $this->writeFile('binary.bin', "\x00\x01\x02");

        $this->assertTrue($this->policy->isBinary($path));
        $this->assertFalse($this->policy->shouldVersion($path, 'users/alice/binary.bin'));
    }

    #[Test]
    public function should_version_utf8_text_without_null_bytes(): void
    {
        $path = $this->writeFile('unicode.txt', 'café — 日本語');

        $this->assertFalse($this->policy->isBinary($path));
        $this->assertTrue($this->policy->shouldVersion($path, 'users/alice/unicode.txt'));
    }

    #[Test]
    public function should_version_extensionless_ascii_when_mime_is_ambiguous(): void
    {
        if (! self::$finfoAvailable) {
            $this->markTestSkipped('fileinfo extension is not available');
        }

        $path = $this->writeFile('README', "# Project\n\nPlain text without extension.\n");

        $this->assertFalse($this->policy->isBinary($path));
        $this->assertTrue($this->policy->shouldVersion($path, 'users/alice/README'));
    }

    /**
     * @return iterable<string, array{0: string, 1: string}>
     */
    public static function versionableTextTypesProvider(): iterable
    {
        yield 'plain text' => ['notes.txt', "Line one\nLine two\n"];
        yield 'markdown' => ['readme.md', "# Title\n\nSome **bold** text.\n"];
        yield 'json' => ['config.json', '{"name":"alice","roles":["user"]}'];
        yield 'csv' => ['data.csv', "name,email\nAlice,alice@example.com\n"];
        yield 'xml' => ['config.xml', '<?xml version="1.0"?><root><item/></root>'];
        yield 'html' => ['index.html', '<!DOCTYPE html><html><body>Hi</body></html>'];
        yield 'javascript' => ['app.js', "export const hello = () => 'world';\n"];
        yield 'yaml' => ['config.yaml', "title: Demo\nitems:\n  - one\n"];
        yield 'svg' => ['icon.svg', '<svg xmlns="http://www.w3.org/2000/svg"><circle r="1"/></svg>'];
        yield 'shell script' => ['deploy.sh', "#!/bin/sh\necho hello\n"];
        yield 'php source' => ['helper.php', "<?php\n echo 'ok';\n"];
        yield 'workspace text' => ['doc.wtc', "workspace text content\n"];
    }

    #[Test]
    #[DataProvider('versionableTextTypesProvider')]
    public function common_text_types_are_versionable(string $filename, string $contents): void
    {
        if (! self::$finfoAvailable) {
            $this->markTestSkipped('fileinfo extension is not available');
        }

        $path = $this->writeFile($filename, $contents);
        $storageKey = 'users/alice/'.$filename;

        $this->assertFalse($this->policy->isBinary($path), $filename.' should not be treated as binary');
        $this->assertTrue($this->policy->shouldVersion($path, $storageKey), $filename.' should be versioned');
    }

    /**
     * @return iterable<string, array{0: string, 1: string}>
     */
    public static function binaryTypesProvider(): iterable
    {
        yield 'png image' => ['photo.png', "\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01"];
        yield 'jpeg image' => ['photo.jpg', "\xFF\xD8\xFF\xE0\x00\x10JFIF\x00\x01"];
        yield 'gif image' => ['animation.gif', 'GIF89a'.str_repeat("\x00", 8)];
        yield 'pdf document' => ['report.pdf', "%PDF-1.4\n1 0 obj\n<<>>\n"];
        yield 'zip archive' => ['archive.zip', "PK\x03\x04".str_repeat("\x00", 12)];
        yield 'docx document' => ['report.docx', "PK\x03\x04".str_repeat("\x00", 12)];
        yield 'gzip archive' => ['backup.gz', "\x1f\x8b\x08".str_repeat("\x00", 5)];
        yield 'windows executable' => ['setup.exe', 'MZ'.str_repeat("\x00", 20)];
    }

    #[Test]
    #[DataProvider('binaryTypesProvider')]
    public function common_binary_types_are_not_versionable(string $filename, string $contents): void
    {
        if (! self::$finfoAvailable) {
            $this->markTestSkipped('fileinfo extension is not available');
        }

        $path = $this->writeFile($filename, $contents);
        $storageKey = 'users/alice/'.$filename;

        $this->assertTrue($this->policy->isBinary($path), $filename.' should be treated as binary');
        $this->assertFalse($this->policy->shouldVersion($path, $storageKey), $filename.' should not be versioned');
    }

    #[Test]
    public function should_not_version_notes_paths(): void
    {
        $path = $this->writeFile('note.md', '# Note');

        $this->assertFalse($this->policy->shouldVersion($path, 'users/alice/.notes/note.md'));
    }

    #[Test]
    public function should_not_version_yjs_sidecar_paths(): void
    {
        $path = $this->writeFile('sidecar.yjs', 'sidecar-data');

        $this->assertFalse($this->policy->shouldVersion($path, 'users/alice/.doc.md.yjs'));
    }

    #[Test]
    public function resolve_from_storage_key_for_user_path(): void
    {
        $scope = $this->policy->resolveFromStorageKey('users/alice/foo/bar.txt');

        $this->assertNotNull($scope);
        $this->assertSame('users/alice', $scope->repoStorageKey);
        $this->assertSame('foo/bar.txt', $scope->relativePath);
    }

    #[Test]
    public function resolve_from_storage_key_for_group_path(): void
    {
        $scope = $this->policy->resolveFromStorageKey('groups/team-a/report.md');

        $this->assertNotNull($scope);
        $this->assertSame('groups/team-a', $scope->repoStorageKey);
        $this->assertSame('report.md', $scope->relativePath);
    }

    #[Test]
    public function resolve_returns_null_for_invalid_keys(): void
    {
        $this->assertNull($this->policy->resolveFromStorageKey('calendars/alice/default'));
        $this->assertNull($this->policy->resolveFromStorageKey('users'));
        $this->assertNull($this->policy->resolveFromStorageKey('users/alice'));
    }

    private function writeFile(string $name, string $contents): string
    {
        $path = $this->tempDir.'/'.$name;
        $dir = dirname($path);
        if (! is_dir($dir)) {
            mkdir($dir, 0775, true);
        }
        file_put_contents($path, $contents);

        return $path;
    }

    private function removeTree(string $dir): void
    {
        if (! is_dir($dir)) {
            return;
        }

        $items = scandir($dir);
        if ($items === false) {
            return;
        }

        foreach ($items as $item) {
            if ($item === '.' || $item === '..') {
                continue;
            }
            $path = $dir.'/'.$item;
            if (is_dir($path)) {
                $this->removeTree($path);
            } else {
                @unlink($path);
            }
        }

        @rmdir($dir);
    }
}
