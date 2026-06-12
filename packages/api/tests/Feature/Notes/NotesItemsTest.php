<?php

declare(strict_types=1);

namespace Tests\Feature\Notes;

use Illuminate\Support\Facades\Storage;
use Tests\Support\NotesTestFixtures;
use Tests\Support\WgwDatabaseTestCase;

final class NotesItemsTest extends WgwDatabaseTestCase
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

    public function test_create_note_persists_on_disk_with_frontmatter(): void
    {
        $token = $this->userBearerToken();
        $response = $this->withBearer($token)->postJson('/api/v1/notes/items', [
            'notebook' => 'Projects',
            'title' => 'Sprint plan',
            'body' => "Line one\nLine two",
            'tags' => ['work', 'sprint'],
            'starred' => true,
        ]);
        $response->assertCreated();
        $id = (string) $response->json('item.id');
        $key = 'users/bob/.notes/Projects/'.$id.'.md';

        $this->assertTrue(Storage::disk('wgw_notes')->exists($key));
        $raw = (string) Storage::disk('wgw_notes')->get($key);
        $this->assertStringContainsString('title: Sprint plan', $raw);
        $this->assertStringContainsString('tags: work, sprint', $raw);
        $this->assertStringContainsString('starred: true', $raw);
        $this->assertStringContainsString("----\nLine one\nLine two", $raw);

        $list = $this->withBearer($token)->getJson('/api/v1/notes/items');
        $list->assertOk();
        $this->assertSame('Sprint plan', $list->json('items.0.title'));
        $this->assertSame("Line one\nLine two", $list->json('items.0.body'));
        $this->assertSame(['work', 'sprint'], $list->json('items.0.tags'));
        $this->assertTrue($list->json('items.0.starred'));
    }

    public function test_update_note_title_body_tags_and_star(): void
    {
        $token = $this->userBearerToken();
        $created = $this->createNoteFor($token, ['title' => 'Original', 'body' => 'old body', 'tags' => ['a']]);
        $id = $created['id'];

        $this->withBearer($token)
            ->putJson('/api/v1/notes/items/'.$id, [
                'notebook' => 'Drafts',
                'title' => 'Updated title',
                'body' => 'new body text',
                'tags' => ['beta', 'gamma'],
                'starred' => true,
            ])
            ->assertOk()
            ->assertJsonPath('item.title', 'Updated title')
            ->assertJsonPath('item.body', 'new body text')
            ->assertJsonPath('item.tags', ['beta', 'gamma'])
            ->assertJsonPath('item.starred', true);

        $this->withBearer($token)
            ->putJson('/api/v1/notes/items/'.$id, [
                'notebook' => 'Drafts',
                'title' => 'Updated title',
                'body' => 'new body text',
                'tags' => ['beta', 'gamma'],
                'starred' => false,
            ])
            ->assertOk()
            ->assertJsonPath('item.starred', false);
    }

    public function test_delete_note_removes_from_list_and_disk(): void
    {
        $token = $this->userBearerToken();
        $created = $this->createNoteFor($token);
        $id = $created['id'];
        $key = 'users/bob/.notes/Drafts/'.$id.'.md';

        $this->withBearer($token)
            ->deleteJson('/api/v1/notes/items/'.$id, [
                'notebook' => 'Drafts',
                'archived' => false,
            ])
            ->assertOk()
            ->assertJsonPath('ok', true);

        $this->assertFalse(Storage::disk('wgw_notes')->exists($key));

        $list = $this->withBearer($token)->getJson('/api/v1/notes/items');
        $list->assertOk()->assertJsonPath('items', []);

        $this->withBearer($token)
            ->deleteJson('/api/v1/notes/items/'.$id, [
                'notebook' => 'Drafts',
                'archived' => false,
            ])
            ->assertStatus(400)
            ->assertJsonPath('error', 'Note not found.');
    }

    public function test_archive_and_restore_note_moves_between_trees(): void
    {
        $token = $this->userBearerToken();
        $created = $this->createNoteFor($token, ['title' => 'To archive']);
        $id = $created['id'];
        $activeKey = 'users/bob/.notes/Drafts/'.$id.'.md';
        $archivedKey = 'users/bob/.notes/.archive/Drafts/'.$id.'.md';

        $this->withBearer($token)
            ->patchJson('/api/v1/notes/items/'.$id, ['archived' => true])
            ->assertOk()
            ->assertJsonPath('item.archived', true);

        $this->assertFalse(Storage::disk('wgw_notes')->exists($activeKey));
        $this->assertTrue(Storage::disk('wgw_notes')->exists($archivedKey));

        $active = $this->withBearer($token)->getJson('/api/v1/notes/items?archived=false');
        $active->assertOk()->assertJsonPath('items', []);

        $archived = $this->withBearer($token)->getJson('/api/v1/notes/items?archived=true');
        $archived->assertOk();
        $this->assertCount(1, $archived->json('items'));
        $this->assertSame($id, $archived->json('items.0.id'));

        $this->withBearer($token)
            ->patchJson('/api/v1/notes/items/'.$id, ['archived' => false])
            ->assertOk()
            ->assertJsonPath('item.archived', false);

        $this->assertTrue(Storage::disk('wgw_notes')->exists($activeKey));
        $this->assertFalse(Storage::disk('wgw_notes')->exists($archivedKey));
    }

    public function test_list_filters_by_notebook_archived_and_query(): void
    {
        $token = $this->userBearerToken();

        $alpha = $this->createNoteFor($token, [
            'notebook' => 'Alpha',
            'title' => 'Alpha title',
            'body' => 'unique-alpha-body',
            'tags' => ['tag-alpha'],
        ]);
        $this->createNoteFor($token, [
            'notebook' => 'Beta',
            'title' => 'Beta title',
            'body' => 'other content',
            'tags' => ['tag-beta'],
        ]);

        $byNotebook = $this->withBearer($token)->getJson('/api/v1/notes/items?notebook=Alpha');
        $byNotebook->assertOk();
        $this->assertCount(1, $byNotebook->json('items'));
        $this->assertSame('Alpha', $byNotebook->json('items.0.notebook'));

        $byTitle = $this->withBearer($token)->getJson('/api/v1/notes/items?'.http_build_query(['q' => 'ALPHA TITLE']));
        $byTitle->assertOk();
        $this->assertCount(1, $byTitle->json('items'));

        $byBody = $this->withBearer($token)->getJson('/api/v1/notes/items?'.http_build_query(['q' => 'unique-alpha']));
        $byBody->assertOk();
        $this->assertCount(1, $byBody->json('items'));

        $byTag = $this->withBearer($token)->getJson('/api/v1/notes/items?'.http_build_query(['q' => 'tag-alpha']));
        $byTag->assertOk();
        $this->assertCount(1, $byTag->json('items'));

        $this->withBearer($token)
            ->patchJson('/api/v1/notes/items/'.$alpha['id'], ['archived' => true])
            ->assertOk();

        $activeOnly = $this->withBearer($token)->getJson('/api/v1/notes/items?archived=false');
        $activeOnly->assertOk();
        $this->assertCount(1, $activeOnly->json('items'));
        $this->assertSame('Beta', $activeOnly->json('items.0.notebook'));
    }

    public function test_invalid_note_id_returns_400(): void
    {
        $token = $this->userBearerToken();

        $this->withBearer($token)
            ->putJson('/api/v1/notes/items/bad!id', [
                'notebook' => 'Drafts',
                'title' => 'Bad',
            ])
            ->assertStatus(400)
            ->assertJsonPath('error', 'Invalid note id.');
    }

    public function test_invalid_notebook_name_returns_400(): void
    {
        $token = $this->userBearerToken();

        $this->withBearer($token)
            ->postJson('/api/v1/notes/items', [
                'notebook' => 'bad/name',
                'title' => 'Nope',
            ])
            ->assertStatus(400)
            ->assertJsonPath('error', 'Invalid notebook name.');
    }

    public function test_missing_required_fields_on_create_return_400(): void
    {
        $token = $this->userBearerToken();

        $this->withBearer($token)
            ->postJson('/api/v1/notes/items', ['notebook' => 'Drafts'])
            ->assertStatus(400);

        $this->withBearer($token)
            ->postJson('/api/v1/notes/items', ['title' => 'No notebook'])
            ->assertStatus(400);
    }
}
