<?php

declare(strict_types=1);

namespace Tests\Feature\Notes;

use Illuminate\Support\Facades\Storage;
use Tests\Support\NotesTestFixtures;
use Tests\Support\WgwDatabaseTestCase;

final class NotesNotebooksTest extends WgwDatabaseTestCase
{
    use NotesTestFixtures;

    protected function setUp(): void
    {
        parent::setUp();
        $this->setUpNotesFixtures();
    }

    protected function tearDown(): void
    {
        $this->tearDownNotesFixtures();
        parent::tearDown();
    }

    public function test_create_notebook_creates_directory(): void
    {
        $token = $this->userBearerToken();

        $this->withBearer($token)
            ->postJson('/api/v1/notes/notebooks', ['name' => 'Ideas'])
            ->assertCreated()
            ->assertJsonPath('ok', true)
            ->assertJsonPath('name', 'Ideas');

        $this->assertTrue(Storage::disk('wgw_notes')->directoryExists('users/bob/.notes/Ideas'));
    }

    public function test_list_notebooks_includes_counts_and_omits_empty_notebooks(): void
    {
        $token = $this->userBearerToken();

        $this->withBearer($token)->postJson('/api/v1/notes/notebooks', ['name' => 'EmptyNB'])->assertCreated();
        $this->createNoteFor($token, ['notebook' => 'Drafts', 'title' => 'One']);
        $archived = $this->createNoteFor($token, ['notebook' => 'Drafts', 'title' => 'Two']);
        $this->withBearer($token)
            ->patchJson('/api/v1/notes/items/'.$archived['id'], ['archived' => true])
            ->assertOk();

        $list = $this->withBearer($token)->getJson('/api/v1/notes/notebooks');
        $list->assertOk();
        $items = $list->json('items');
        $names = array_column($items, 'name');
        $this->assertContains('Drafts', $names);
        $this->assertNotContains('EmptyNB', $names);
        $this->assertNotContains('Projects', $names);

        $drafts = collect($items)->firstWhere('name', 'Drafts');
        $this->assertIsArray($drafts);
        $this->assertSame(1, $drafts['activeCount']);
        $this->assertSame(1, $drafts['archivedCount']);
    }

    public function test_duplicate_notebook_create_returns_400(): void
    {
        $token = $this->userBearerToken();

        $this->withBearer($token)->postJson('/api/v1/notes/notebooks', ['name' => 'Dup'])->assertCreated();
        $this->withBearer($token)
            ->postJson('/api/v1/notes/notebooks', ['name' => 'Dup'])
            ->assertStatus(400)
            ->assertJsonPath('error', 'Notebook already exists.');
    }

    public function test_rename_notebook_moves_notes_on_disk(): void
    {
        $token = $this->userBearerToken();
        $note = $this->createNoteFor($token, ['notebook' => 'OldName', 'title' => 'Keep me']);
        $oldKey = 'users/bob/.notes/OldName/'.$note['id'].'.md';
        $newKey = 'users/bob/.notes/NewName/'.$note['id'].'.md';

        $this->assertTrue(Storage::disk('wgw_notes')->exists($oldKey));

        $this->withBearer($token)
            ->patchJson('/api/v1/notes/notebooks/'.rawurlencode('OldName'), ['name' => 'NewName'])
            ->assertOk()
            ->assertJsonPath('from', 'OldName')
            ->assertJsonPath('to', 'NewName');

        $this->assertFalse(Storage::disk('wgw_notes')->exists($oldKey));
        $this->assertTrue(Storage::disk('wgw_notes')->exists($newKey));

        $list = $this->withBearer($token)->getJson('/api/v1/notes/items');
        $list->assertOk();
        $this->assertSame('NewName', $list->json('items.0.notebook'));
    }

    public function test_delete_notebook_archive_mode_moves_active_notes_to_archive_tree(): void
    {
        $token = $this->userBearerToken();
        $note = $this->createNoteFor($token, ['notebook' => 'ToArchive', 'title' => 'Archive me']);
        $activeKey = 'users/bob/.notes/ToArchive/'.$note['id'].'.md';
        $archivedKey = 'users/bob/.notes/.archive/ToArchive/'.$note['id'].'.md';

        $this->withBearer($token)
            ->deleteJson('/api/v1/notes/notebooks/'.rawurlencode('ToArchive'), ['mode' => 'archive'])
            ->assertOk()
            ->assertJsonPath('mode', 'archive');

        $this->assertFalse(Storage::disk('wgw_notes')->exists($activeKey));
        $this->assertTrue(Storage::disk('wgw_notes')->exists($archivedKey));

        $archivedList = $this->withBearer($token)->getJson('/api/v1/notes/items?archived=true');
        $archivedList->assertOk();
        $this->assertCount(1, $archivedList->json('items'));
        $this->assertTrue($archivedList->json('items.0.archived'));
    }

    public function test_delete_notebook_move_mode_moves_notes_to_target(): void
    {
        $token = $this->userBearerToken();
        $this->withBearer($token)->postJson('/api/v1/notes/notebooks', ['name' => 'Target'])->assertCreated();
        $note = $this->createNoteFor($token, ['notebook' => 'Source', 'title' => 'Move me']);
        $sourceKey = 'users/bob/.notes/Source/'.$note['id'].'.md';
        $targetKey = 'users/bob/.notes/Target/'.$note['id'].'.md';

        $this->withBearer($token)
            ->deleteJson('/api/v1/notes/notebooks/'.rawurlencode('Source'), [
                'mode' => 'move',
                'target' => 'Target',
            ])
            ->assertOk()
            ->assertJsonPath('mode', 'move')
            ->assertJsonPath('target', 'Target');

        $this->assertFalse(Storage::disk('wgw_notes')->exists($sourceKey));
        $this->assertTrue(Storage::disk('wgw_notes')->exists($targetKey));

        $list = $this->withBearer($token)->getJson('/api/v1/notes/items');
        $list->assertOk();
        $this->assertSame('Target', $list->json('items.0.notebook'));
    }

    public function test_delete_notebook_purge_mode_removes_all_notes(): void
    {
        $token = $this->userBearerToken();
        $active = $this->createNoteFor($token, ['notebook' => 'PurgeMe', 'title' => 'Active']);
        $archived = $this->createNoteFor($token, ['notebook' => 'PurgeMe', 'title' => 'Archived']);
        $this->withBearer($token)
            ->patchJson('/api/v1/notes/items/'.$archived['id'], ['archived' => true])
            ->assertOk();

        $this->withBearer($token)
            ->deleteJson('/api/v1/notes/notebooks/'.rawurlencode('PurgeMe'), ['mode' => 'purge'])
            ->assertOk()
            ->assertJsonPath('mode', 'purge');

        $this->assertFalse(Storage::disk('wgw_notes')->exists('users/bob/.notes/PurgeMe/'.$active['id'].'.md'));
        $this->assertFalse(Storage::disk('wgw_notes')->exists('users/bob/.notes/.archive/PurgeMe/'.$archived['id'].'.md'));

        $list = $this->withBearer($token)->getJson('/api/v1/notes/items');
        $list->assertOk()->assertJsonPath('items', []);
    }
}
