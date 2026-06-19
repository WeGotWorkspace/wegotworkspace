<?php

declare(strict_types=1);

namespace Tests\Feature\Notes;

use Illuminate\Support\Facades\Storage;
use Tests\Support\NotesTestFixtures;
use Tests\Support\WgwDatabaseTestCase;

/**
 * Integration seam B: a body-only collab save (`PUT /files/collaboration`) must
 * not perturb the note's metadata `updatedAt`. Otherwise an offline metadata
 * change that flushes later with its pre-body-edit `ifInState` would see the
 * server as "newer" and raise a spurious NotesConflictDialog stateMismatch.
 */
final class NotesCollabBodyStateTest extends WgwDatabaseTestCase
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

    public function test_collab_body_save_does_not_advance_note_updated_at(): void
    {
        $token = $this->userBearerToken();
        $created = $this->createNoteFor($token, [
            'notebook' => 'Drafts',
            'title' => 'Stable meta',
            'body' => 'original body',
            'tags' => ['keep'],
        ]);
        $id = $created['id'];
        $beforeUpdatedAt = (string) $created['item']['updatedAt'];
        $this->assertNotSame('', $beforeUpdatedAt);

        // Body edit flows through the collab document, room = note virtual path.
        $room = '/users/bob/.notes/Drafts/'.$id.'.md';
        $this->withBearer($token)
            ->putJson('/api/v1/files/collaboration?path='.urlencode($room), [
                'markdown' => "rewritten body from collab\n",
            ])
            ->assertOk()
            ->assertJsonPath('ok', true);

        // The body section was replaced; frontmatter (title/tags) is preserved.
        $key = 'users/bob/.notes/Drafts/'.$id.'.md';
        $raw = (string) Storage::disk('wgw_notes')->get($key);
        $this->assertStringContainsString('title: Stable meta', $raw);
        $this->assertStringContainsString('tags: keep', $raw);
        $this->assertStringContainsString('rewritten body from collab', $raw);

        // The regression guarantee: `updatedAt` is unchanged by a body save, so
        // the offline metadata `ifInState` guard (server <= base) never trips.
        $list = $this->withBearer($token)->getJson('/api/v1/notes/items');
        $list->assertOk();
        $afterUpdatedAt = (string) $list->json('items.0.updatedAt');
        $this->assertSame($beforeUpdatedAt, $afterUpdatedAt);
        $this->assertSame('rewritten body from collab', $list->json('items.0.body'));

        // Simulate the client guard: pre-body-edit base vs current server state.
        $baseMs = (int) (strtotime($beforeUpdatedAt) * 1000);
        $serverMs = (int) (strtotime($afterUpdatedAt) * 1000);
        $this->assertLessThanOrEqual($baseMs, $serverMs, 'body save must not look server-newer');
    }

    public function test_metadata_put_with_body_omitted_preserves_collab_body(): void
    {
        $token = $this->userBearerToken();
        $created = $this->createNoteFor($token, [
            'notebook' => 'Drafts',
            'title' => 'Title before',
            'body' => 'seed body',
            'tags' => ['a'],
        ]);
        $id = $created['id'];

        $room = '/users/bob/.notes/Drafts/'.$id.'.md';
        $this->withBearer($token)
            ->putJson('/api/v1/files/collaboration?path='.urlencode($room), [
                'markdown' => "collab body wins\n",
            ])
            ->assertOk();

        // Metadata-only PUT: `body` key omitted entirely so the on-disk body is
        // preserved (sending body: "" / null would clear it).
        $this->withBearer($token)
            ->putJson('/api/v1/notes/items/'.$id, [
                'notebook' => 'Drafts',
                'title' => 'Title after',
                'tags' => ['a', 'b'],
            ])
            ->assertOk()
            ->assertJsonPath('item.title', 'Title after')
            ->assertJsonPath('item.tags', ['a', 'b'])
            ->assertJsonPath('item.body', 'collab body wins');
    }
}
