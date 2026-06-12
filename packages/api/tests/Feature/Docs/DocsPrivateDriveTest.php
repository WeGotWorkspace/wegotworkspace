<?php

declare(strict_types=1);

namespace Tests\Feature\Docs;

use Illuminate\Support\Facades\Storage;
use Tests\Support\DocsTestFixtures;
use Tests\Support\WgwDatabaseTestCase;

final class DocsPrivateDriveTest extends WgwDatabaseTestCase
{
    use DocsTestFixtures;

    protected function setUp(): void
    {
        parent::setUp();
        $this->setUpDocsFixtures();
    }

    protected function tearDown(): void
    {
        $this->tearDownDocsFixtures();
        parent::tearDown();
    }

    public function test_user_loads_markdown_document_from_private_drive(): void
    {
        $path = $this->seedDocFile('bob', 'report.md', "# Report\n\nQuarterly summary.");
        $token = $this->userBearerToken();

        $response = $this->loadDocContent($token, $path);
        $response->assertOk();
        $this->assertStringContainsString('# Report', $response->streamedContent());
        $this->assertStringContainsString('Quarterly summary.', $response->streamedContent());
        $this->assertTrue(Storage::disk('wgw_files')->exists('users/bob/docs/report.md'));
    }

    public function test_user_saves_and_overwrites_markdown_via_resumable_upload(): void
    {
        $token = $this->userBearerToken();
        $parent = '/users/bob/docs';

        $first = $this->uploadDoc($token, $parent, 'note.md', "# Draft\n\nFirst save.");
        $first->assertOk();
        $this->assertSame('Stored', $first->getContent());

        $loaded = $this->loadDocContent($token, $parent.'/note.md');
        $loaded->assertOk();
        $this->assertStringContainsString('First save.', $loaded->streamedContent());

        $second = $this->uploadDoc($token, $parent, 'note.md', "# Draft\n\nSecond save.");
        $second->assertOk();

        $reloaded = $this->loadDocContent($token, $parent.'/note.md');
        $reloaded->assertOk();
        $this->assertStringContainsString('Second save.', $reloaded->streamedContent());
        $this->assertStringNotContainsString('First save.', $reloaded->streamedContent());
    }

    public function test_plain_text_document_upload_and_download_round_trip(): void
    {
        $token = $this->userBearerToken();
        $parent = '/users/bob/docs';

        $this->uploadDoc($token, $parent, 'readme.txt', "Plain text doc.\nLine two.")
            ->assertOk();

        $response = $this->loadDocContent($token, $parent.'/readme.txt');
        $response->assertOk();
        $this->assertSame("Plain text doc.\nLine two.", $response->streamedContent());
    }

    public function test_user_renames_document_in_private_drive(): void
    {
        $path = $this->seedDocFile('bob', 'old.md', '# Old title');
        $token = $this->userBearerToken();

        $this->withBearer($token)->patchJson('/api/v1/files?path='.$path, [
            'name' => 'new.md',
        ])->assertOk()->assertJsonPath('data', 'Renamed');

        $this->assertFalse(Storage::disk('wgw_files')->exists('users/bob/docs/old.md'));
        $this->assertTrue(Storage::disk('wgw_files')->exists('users/bob/docs/new.md'));

        $content = $this->loadDocContent($token, '/users/bob/docs/new.md');
        $content->assertOk();
        $this->assertStringContainsString('# Old title', $content->streamedContent());

        $missing = $this->loadDocContent($token, '/users/bob/docs/old.md');
        $missing->assertStatus(400);
    }

    public function test_admin_loads_own_private_markdown_document(): void
    {
        $path = $this->seedDocFile('alice', 'admin-notes.md', '# Admin notes');
        $token = $this->adminBearerToken();

        $response = $this->loadDocContent($token, $path);
        $response->assertOk();
        $this->assertStringContainsString('# Admin notes', $response->streamedContent());
    }

    public function test_download_of_nonexistent_private_doc_returns_not_found(): void
    {
        $token = $this->userBearerToken();

        $this->loadDocContent($token, '/users/bob/docs/missing.md')
            ->assertStatus(400)
            ->assertJsonPath('error', 'File not found.');
    }
}
