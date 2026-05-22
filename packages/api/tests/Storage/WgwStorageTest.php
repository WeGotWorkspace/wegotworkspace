<?php

declare(strict_types=1);

namespace Tests\Storage;

use App\Storage\StoragePaths;
use App\Storage\WgwStorage;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

final class WgwStorageTest extends TestCase
{
    public function test_virtual_path_maps_to_storage_key(): void
    {
        $paths = new StoragePaths;
        $this->assertSame('users/alice/doc.txt', $paths->virtualToStorageKey('/users/alice/doc.txt'));
        $this->assertSame(
            'users/alice/.notes/note.md',
            $paths->noteStorageKey('alice', 'note.md')
        );
    }

    public function test_files_disk_put_and_get_with_fake(): void
    {
        Storage::fake('wgw_files');
        Storage::fake('wgw_notes');
        Storage::fake('wgw_data');

        $storage = $this->app->make(WgwStorage::class);
        $storage->putVirtual('/users/alice/hello.txt', 'contents');
        $this->assertSame('contents', $storage->getVirtual('/users/alice/hello.txt'));
        $this->assertTrue($storage->files()->exists('users/alice/hello.txt'));
    }

    public function test_notes_disk_uses_note_prefix(): void
    {
        Storage::fake('wgw_files');
        Storage::fake('wgw_notes');

        $storage = $this->app->make(WgwStorage::class);
        $key = $storage->paths()->noteStorageKey('bob', 'daily.md');
        $storage->notes()->put($key, '# Daily');
        $this->assertSame('# Daily', $storage->notes()->get($key));
    }
}
