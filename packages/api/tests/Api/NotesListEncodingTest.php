<?php

declare(strict_types=1);

namespace Tests\Api;

use App\Api\ApiDomainHandlers;
use PHPUnit\Framework\TestCase;

final class NotesListEncodingTest extends TestCase
{
    private string|false|null $previousDataDir = null;

    protected function tearDown(): void
    {
        if ($this->previousDataDir === false || $this->previousDataDir === null) {
            putenv('SABRE_DATA_DIR');
        } else {
            putenv('SABRE_DATA_DIR='.$this->previousDataDir);
        }
        parent::tearDown();
    }

    public function testNotesListEncodesWhenAppleDoubleSidecarIsPresent(): void
    {
        $root = sys_get_temp_dir().'/wgw-notes-encoding-'.bin2hex(random_bytes(4));
        $drafts = $root.'/files/users/alice/.notes/Drafts';
        mkdir($drafts, 0775, true);

        file_put_contents(
            $drafts.'/good.md',
            "title: Visible\ntags:\nstarred: false\n----\nHello",
        );
        file_put_contents($drafts.'/._good.md', "\x00\xff Mac OS X\x00\x00 resource fork");

        $this->previousDataDir = getenv('SABRE_DATA_DIR');
        putenv('SABRE_DATA_DIR='.$root);

        $method = new \ReflectionMethod(ApiDomainHandlers::class, 'notesList');
        $payload = $method->invoke(null, 'alice', []);
        $json = json_encode($payload, JSON_UNESCAPED_SLASHES | JSON_INVALID_UTF8_SUBSTITUTE);

        self::assertIsString($json);
        self::assertNotSame('', $json);
        self::assertCount(1, $payload['items']);
        self::assertSame('good', $payload['items'][0]['id']);
        self::assertSame('Visible', $payload['items'][0]['title']);

        self::deleteTree($root);
    }

    private static function deleteTree(string $dir): void
    {
        if (!is_dir($dir)) {
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
                self::deleteTree($path);
            } else {
                @unlink($path);
            }
        }
        @rmdir($dir);
    }
}
