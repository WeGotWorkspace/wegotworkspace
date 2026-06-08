<?php

declare(strict_types=1);

namespace Tests\Feature\Notes;

use App\Support\WgwInstallConfig;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Storage;
use Tests\Support\WgwDatabaseTestCase;

final class NotesEndpointsTest extends WgwDatabaseTestCase
{
    private string $dataDir = '';

    protected function setUp(): void
    {
        parent::setUp();

        putenv('WGW_DISABLE_LOGIN_THROTTLE=1');

        $this->dataDir = storage_path('framework/testing/wgw-notes-'.uniqid('', true));
        File::ensureDirectoryExists($this->dataDir.'/files');
        config(['wgw.data_dir' => $this->dataDir]);
        $install = $this->app->make(WgwInstallConfig::class);
        $filesRoot = rtrim($install->filesDir(), '/');
        config([
            'filesystems.disks.wgw_files.root' => $filesRoot,
            'filesystems.disks.wgw_notes.root' => $filesRoot,
        ]);
        Storage::purge('wgw_files');
        Storage::purge('wgw_notes');
        $this->configureWgwJwtKeys();

        $this->seedWgwUser('alice', displayName: 'Alice');
    }

    protected function tearDown(): void
    {
        if ($this->dataDir !== '' && File::isDirectory($this->dataDir)) {
            File::deleteDirectory($this->dataDir);
        }
        parent::tearDown();
    }

    public function test_notes_crud_archive_and_notebooks(): void
    {
        $token = $this->issueBearerToken();

        $create = $this->withBearer($token)->postJson('/api/v1/notes/items', [
            'notebook' => 'Drafts',
            'title' => 'Hello',
            'body' => 'World',
            'tags' => ['demo'],
            'starred' => false,
            'archived' => false,
        ]);
        $create->assertCreated();
        $noteId = (string) $create->json('item.id');
        $this->assertNotSame('', $noteId);

        $list = $this->withBearer($token)->getJson('/api/v1/notes/items');
        $list->assertOk();
        $this->assertCount(1, $list->json('items'));

        $archive = $this->withBearer($token)->patchJson('/api/v1/notes/items/'.$noteId, [
            'archived' => true,
        ]);
        $archive->assertOk();
        $this->assertTrue($archive->json('item.archived'));

        $active = $this->withBearer($token)->getJson('/api/v1/notes/items?archived=false');
        $this->assertSame([], $active->json('items'));

        $restore = $this->withBearer($token)->patchJson('/api/v1/notes/items/'.$noteId, [
            'archived' => false,
        ]);
        $restore->assertOk();
        $this->assertFalse($restore->json('item.archived'));

        $this->withBearer($token)->postJson('/api/v1/notes/notebooks', [
            'name' => 'Projects',
        ])->assertCreated();

        $notebooks = $this->withBearer($token)->getJson('/api/v1/notes/notebooks');
        $notebooks->assertOk();
        $names = array_column($notebooks->json('items'), 'name');
        $this->assertContains('Drafts', $names);
        $this->assertNotContains('Projects', $names);
    }

    public function test_notes_upsert_allows_empty_body_and_no_tags(): void
    {
        $token = $this->issueBearerToken();

        $create = $this->withBearer($token)->postJson('/api/v1/notes/items', [
            'notebook' => 'Drafts',
            'title' => 'Blank',
        ]);
        $create->assertCreated();
        $noteId = (string) $create->json('item.id');
        $this->assertSame('', $create->json('item.body'));
        $this->assertSame([], $create->json('item.tags'));

        $update = $this->withBearer($token)->putJson('/api/v1/notes/items/'.$noteId, [
            'notebook' => 'Drafts',
            'title' => 'Still blank',
            'body' => '',
            'tags' => [],
        ]);
        $update->assertOk();
        $this->assertSame('', $update->json('item.body'));
        $this->assertSame([], $update->json('item.tags'));
    }

    public function test_notes_list_skips_apple_double_sidecar_files(): void
    {
        $drafts = $this->dataDir.'/files/users/alice/.notes/Drafts';
        File::ensureDirectoryExists($drafts);
        File::put(
            $drafts.'/good.md',
            "title: Visible\ntags:\nstarred: false\n----\nHello"
        );
        File::put($drafts.'/._good.md', "\x00\xff Mac OS X\x00\x00 resource fork");

        $token = $this->issueBearerToken();
        $list = $this->withBearer($token)->getJson('/api/v1/notes/items');
        $list->assertOk();
        $this->assertCount(1, $list->json('items'));
        $this->assertSame('good', $list->json('items.0.id'));
        $this->assertSame('Visible', $list->json('items.0.title'));
    }

    public function test_notes_capabilities_and_state(): void
    {
        $token = $this->issueBearerToken();

        $this->withBearer($token)->getJson('/api/v1/notes/capabilities')
            ->assertOk()
            ->assertJsonStructure(['enabled', 'distReady', 'baseUri']);

        $this->withBearer($token)->getJson('/api/v1/notes/state')
            ->assertOk()
            ->assertJsonPath('username', 'alice')
            ->assertJsonStructure(['notesPath', 'logoutUrl', 'filesEnabled']);
    }
}
