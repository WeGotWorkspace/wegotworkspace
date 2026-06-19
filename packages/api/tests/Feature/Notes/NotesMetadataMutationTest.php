<?php

declare(strict_types=1);

namespace Tests\Feature\Notes;

use Illuminate\Support\Facades\Storage;
use Tests\Support\NotesTestFixtures;
use Tests\Support\WgwDatabaseTestCase;

/**
 * #235 — Notes metadata-only mutations: body becomes optional on upsert and the
 * markdown body section is preserved when omitted, including coexistence with
 * the collab body persistence path (`PUT /files/collaboration`).
 */
final class NotesMetadataMutationTest extends WgwDatabaseTestCase
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

    public function test_metadata_only_put_preserves_existing_body(): void
    {
        $token = $this->userBearerToken();
        $created = $this->createNoteFor($token, [
            'notebook' => 'Drafts',
            'title' => 'Original',
            'body' => "First paragraph\n\nSecond paragraph",
            'tags' => ['old'],
            'starred' => false,
        ]);
        $id = $created['id'];
        $key = 'users/bob/.notes/Drafts/'.$id.'.md';

        // PUT without a body field: frontmatter updates, body stays intact.
        $this->withBearer($token)
            ->putJson('/api/v1/notes/items/'.$id, [
                'notebook' => 'Drafts',
                'title' => 'Renamed',
                'tags' => ['new', 'shiny'],
                'starred' => true,
            ])
            ->assertOk()
            ->assertJsonPath('item.title', 'Renamed')
            ->assertJsonPath('item.tags', ['new', 'shiny'])
            ->assertJsonPath('item.starred', true)
            ->assertJsonPath('item.body', "First paragraph\n\nSecond paragraph");

        $raw = (string) Storage::disk('wgw_notes')->get($key);
        $this->assertStringContainsString('title: Renamed', $raw);
        $this->assertStringContainsString('tags: new, shiny', $raw);
        $this->assertStringContainsString("----\nFirst paragraph\n\nSecond paragraph", $raw);
    }

    public function test_put_with_body_still_overwrites_body(): void
    {
        $token = $this->userBearerToken();
        $created = $this->createNoteFor($token, ['title' => 'T', 'body' => 'old body']);
        $id = $created['id'];

        $this->withBearer($token)
            ->putJson('/api/v1/notes/items/'.$id, [
                'notebook' => 'Drafts',
                'title' => 'T',
                'body' => 'brand new body',
            ])
            ->assertOk()
            ->assertJsonPath('item.body', 'brand new body');
    }

    public function test_put_with_empty_string_body_clears_body(): void
    {
        $token = $this->userBearerToken();
        $created = $this->createNoteFor($token, ['title' => 'T', 'body' => 'has content']);
        $id = $created['id'];

        $this->withBearer($token)
            ->putJson('/api/v1/notes/items/'.$id, [
                'notebook' => 'Drafts',
                'title' => 'T',
                'body' => '',
            ])
            ->assertOk()
            ->assertJsonPath('item.body', '');
    }

    public function test_collab_body_save_and_metadata_put_do_not_clobber(): void
    {
        $token = $this->userBearerToken();
        $created = $this->createNoteFor($token, [
            'notebook' => 'Drafts',
            'title' => 'Shared draft',
            'body' => 'initial body',
            'tags' => ['draft'],
        ]);
        $id = $created['id'];
        $path = '/users/bob/.notes/Drafts/'.$id.'.md';

        // Collab exposes the body section only (frontmatter stays Notes-owned).
        $this->withBearer($token)
            ->get('/api/v1/files/collaboration?path='.urlencode($path))
            ->assertOk()
            ->assertSeeText('initial body');

        // Body edited through the collab path.
        $this->withBearer($token)
            ->putJson('/api/v1/files/collaboration?path='.urlencode($path), [
                'markdown' => 'body rewritten by collab',
            ])
            ->assertOk()
            ->assertJsonPath('ok', true);

        // Frontmatter survived the collab body write.
        $afterCollab = $this->withBearer($token)->getJson('/api/v1/notes/items');
        $afterCollab->assertOk();
        $this->assertSame('Shared draft', $afterCollab->json('items.0.title'));
        $this->assertSame(['draft'], $afterCollab->json('items.0.tags'));
        $this->assertSame('body rewritten by collab', $afterCollab->json('items.0.body'));

        // Metadata-only PUT does not clobber the collab-written body.
        $this->withBearer($token)
            ->putJson('/api/v1/notes/items/'.$id, [
                'notebook' => 'Drafts',
                'title' => 'Renamed after collab',
                'tags' => ['final'],
            ])
            ->assertOk()
            ->assertJsonPath('item.title', 'Renamed after collab')
            ->assertJsonPath('item.body', 'body rewritten by collab');

        // Collab still reads only the body section after the metadata change.
        $this->withBearer($token)
            ->get('/api/v1/files/collaboration?path='.urlencode($path))
            ->assertOk()
            ->assertDontSeeText('Renamed after collab')
            ->assertSeeText('body rewritten by collab');
    }
}
