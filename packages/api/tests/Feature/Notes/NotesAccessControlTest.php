<?php

declare(strict_types=1);

namespace Tests\Feature\Notes;

use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Storage;
use Tests\Support\NotesTestFixtures;
use Tests\Support\WgwDatabaseTestCase;

final class NotesAccessControlTest extends WgwDatabaseTestCase
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

    public function test_guest_cannot_access_notes_endpoints(): void
    {
        $this->getJson('/api/v1/notes/capabilities')->assertUnauthorized();
        $this->getJson('/api/v1/notes/state')->assertUnauthorized();
        $this->getJson('/api/v1/notes/items')->assertUnauthorized();
        $this->postJson('/api/v1/notes/items', [])->assertUnauthorized();
        $this->putJson('/api/v1/notes/items/example', [])->assertUnauthorized();
        $this->patchJson('/api/v1/notes/items/example', [])->assertUnauthorized();
        $this->deleteJson('/api/v1/notes/items/example')->assertUnauthorized();
        $this->getJson('/api/v1/notes/notebooks')->assertUnauthorized();
        $this->postJson('/api/v1/notes/notebooks', [])->assertUnauthorized();
        $this->patchJson('/api/v1/notes/notebooks/Drafts', [])->assertUnauthorized();
        $this->deleteJson('/api/v1/notes/notebooks/Drafts')->assertUnauthorized();
    }

    public function test_users_only_see_own_notes(): void
    {
        $bobNote = $this->createNoteFor($this->userBearerToken(), [
            'title' => 'Bob secret',
            'body' => 'bob-only-content',
        ]);
        $carolNote = $this->createNoteFor($this->carolBearerToken(), [
            'title' => 'Carol secret',
            'body' => 'carol-only-content',
        ]);

        $bobList = $this->withBearer($this->userBearerToken())->getJson('/api/v1/notes/items');
        $bobList->assertOk();
        $bobIds = array_column($bobList->json('items'), 'id');
        $this->assertContains($bobNote['id'], $bobIds);
        $this->assertNotContains($carolNote['id'], $bobIds);

        $carolList = $this->withBearer($this->carolBearerToken())->getJson('/api/v1/notes/items');
        $carolList->assertOk();
        $carolIds = array_column($carolList->json('items'), 'id');
        $this->assertContains($carolNote['id'], $carolIds);
        $this->assertNotContains($bobNote['id'], $carolIds);
    }

    public function test_user_cannot_delete_other_users_note_by_id(): void
    {
        $carolNote = $this->createNoteFor($this->carolBearerToken(), [
            'title' => 'Carol private',
        ]);
        $carolKey = 'users/carol/.notes/Drafts/'.$carolNote['id'].'.md';

        $this->withBearer($this->userBearerToken())
            ->deleteJson('/api/v1/notes/items/'.$carolNote['id'], [
                'notebook' => 'Drafts',
                'archived' => false,
            ])
            ->assertStatus(400)
            ->assertJsonPath('error', 'Note not found.');

        $this->assertTrue(Storage::disk('wgw_notes')->exists($carolKey));

        $carolList = $this->withBearer($this->carolBearerToken())->getJson('/api/v1/notes/items');
        $carolList->assertOk();
        $this->assertCount(1, $carolList->json('items'));
    }

    public function test_admin_sees_own_notes_not_other_users(): void
    {
        $bobNote = $this->createNoteFor($this->userBearerToken(), ['title' => 'Bob note']);
        $this->createNoteFor($this->adminBearerToken(), ['title' => 'Alice note']);

        $aliceList = $this->withBearer($this->adminBearerToken())->getJson('/api/v1/notes/items');
        $aliceList->assertOk();
        $aliceIds = array_column($aliceList->json('items'), 'id');
        $this->assertNotContains($bobNote['id'], $aliceIds);
        $this->assertCount(1, $aliceList->json('items'));

        $this->withBearer($this->adminBearerToken())
            ->getJson('/api/v1/notes/state')
            ->assertOk()
            ->assertJsonPath('username', 'alice');
    }

    public function test_each_user_has_isolated_notes_tree_on_disk(): void
    {
        $this->createNoteFor($this->userBearerToken(), ['notebook' => 'Drafts']);
        $this->createNoteFor($this->carolBearerToken(), ['notebook' => 'Drafts']);

        $this->assertTrue(File::isDirectory($this->notesDataDirectory().'/files/users/bob/.notes/Drafts'));
        $this->assertTrue(File::isDirectory($this->notesDataDirectory().'/files/users/carol/.notes/Drafts'));
        $this->assertFalse(File::isDirectory($this->notesDataDirectory().'/files/users/alice/.notes'));
    }
}
