<?php

declare(strict_types=1);

namespace Tests\Feature\Notes;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Tests\Support\NotesTestFixtures;
use Tests\Support\WgwDatabaseTestCase;

final class NotesSearchIndexTest extends WgwDatabaseTestCase
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

    public function test_create_note_indexes_search_document(): void
    {
        $token = $this->userBearerToken();
        $created = $this->createNoteFor($token, [
            'body' => 'indexneedle789',
        ]);
        $key = 'users/bob/.notes/Drafts/'.$created['id'].'.md';

        $row = DB::connection('wgw')->table('search_documents')
            ->where('source_type', 'note')
            ->where('source_key', $key)
            ->first();

        $this->assertNotNull($row);
        $this->assertSame('note', $row->category);
        $this->assertSame('Untitled', $row->title);
        $this->assertStringContainsString('indexneedle789', (string) $row->body_text);
        $this->assertSame('bob', $row->owner_username);
    }

    public function test_update_note_preserves_frontmatter_title_in_search_index(): void
    {
        $token = $this->userBearerToken();
        $key = 'users/bob/.notes/Drafts/note-search-title.md';
        Storage::disk('wgw_notes')->put(
            $key,
            "title: First\ntags:\nstarred: false\n----\noldindex111"
        );

        $this->withBearer($token)
            ->putJson('/api/v1/notes/items/note-search-title', [
                'notebook' => 'Drafts',
                'body' => 'newindex222',
                'tags' => [],
            ])
            ->assertOk();

        $row = DB::connection('wgw')->table('search_documents')
            ->where('source_type', 'note')
            ->where('source_key', $key)
            ->first();

        $this->assertNotNull($row);
        $this->assertSame('First', $row->title);
        $this->assertStringContainsString('newindex222', (string) $row->body_text);
        $this->assertStringNotContainsString('oldindex111', (string) $row->body_text);
    }

    public function test_delete_note_removes_from_search_index(): void
    {
        $token = $this->userBearerToken();
        $created = $this->createNoteFor($token, ['body' => 'deleteme333']);
        $key = 'users/bob/.notes/Drafts/'.$created['id'].'.md';

        $this->assertNotNull(DB::connection('wgw')->table('search_documents')
            ->where('source_key', $key)
            ->first());

        $this->withBearer($token)
            ->deleteJson('/api/v1/notes/items/'.$created['id'], [
                'notebook' => 'Drafts',
                'archived' => false,
            ])
            ->assertOk();

        $this->assertNull(DB::connection('wgw')->table('search_documents')
            ->where('source_key', $key)
            ->first());
    }

    public function test_archive_note_updates_search_index_key(): void
    {
        $token = $this->userBearerToken();
        $created = $this->createNoteFor($token, ['body' => 'archiveindex444']);
        $activeKey = 'users/bob/.notes/Drafts/'.$created['id'].'.md';
        $archivedKey = 'users/bob/.notes/.archive/Drafts/'.$created['id'].'.md';

        $this->withBearer($token)
            ->patchJson('/api/v1/notes/items/'.$created['id'], ['archived' => true])
            ->assertOk();

        $this->assertNull(DB::connection('wgw')->table('search_documents')
            ->where('source_key', $activeKey)
            ->first());
        $archivedRow = DB::connection('wgw')->table('search_documents')
            ->where('source_type', 'note')
            ->where('source_key', $archivedKey)
            ->first();
        $this->assertNotNull($archivedRow);
        $this->assertStringContainsString('archiveindex444', (string) $archivedRow->body_text);
    }
}
