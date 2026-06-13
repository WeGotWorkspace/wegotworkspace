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

    public function test_load_private_markdown_document(): void
    {
        $token = $this->userBearerToken();
        $path = $this->seedDocFile('bob', 'report.md', "# Report\n\nQuarterly summary.");

        $response = $this->getDocContent($token, $path);

        $response->assertOk()
            ->assertHeader('content-type', 'text/markdown; charset=utf-8');
        $this->assertStringContainsString('# Report', $response->streamedContent());
        $this->assertTrue(Storage::disk('wgw_files')->exists('users/bob/docs/report.md'));
    }

    public function test_save_markdown_via_resumable_upload(): void
    {
        $token = $this->userBearerToken();

        $upload = $this->uploadDoc($token, '/users/bob/docs', 'note.md', "# Draft\n\nFirst save.");
        $upload->assertOk();
        $this->assertSame('Stored', $upload->getContent());

        $download = $this->getDocContent($token, '/users/bob/docs/note.md');
        $download->assertOk();
        $this->assertStringContainsString('First save.', $download->streamedContent());
    }

    public function test_second_upload_overwrites_prior_markdown(): void
    {
        $token = $this->userBearerToken();
        $parent = '/users/bob/docs';

        $this->uploadDoc($token, $parent, 'note.md', "# Draft\n\nVersion one.")->assertOk();
        $this->uploadDoc($token, $parent, 'note.md', "# Draft\n\nVersion two.", 'overwrite-id')->assertOk();

        $download = $this->getDocContent($token, '/users/bob/docs/note.md');
        $download->assertOk();
        $body = $download->streamedContent();
        $this->assertStringContainsString('Version two.', $body);
        $this->assertStringNotContainsString('Version one.', $body);
    }

    public function test_plain_text_document_round_trip(): void
    {
        $token = $this->userBearerToken();

        $this->uploadDoc($token, '/users/bob/docs', 'readme.txt', "Plain text doc.\n")->assertOk();

        $download = $this->getDocContent($token, '/users/bob/docs/readme.txt');
        $download->assertOk()
            ->assertHeader('content-type', 'text/plain; charset=utf-8');
        $this->assertSame("Plain text doc.\n", $download->streamedContent());
    }

    public function test_rename_private_document_preserves_content(): void
    {
        $token = $this->userBearerToken();
        $this->seedDocFile('bob', 'old.md', '# Old title');

        $this->withBearer($token)->patchJson('/api/v1/files?path=/users/bob/docs/old.md', [
            'name' => 'new.md',
        ])->assertOk()->assertJsonPath('data', 'Renamed');

        $this->assertFalse(Storage::disk('wgw_files')->exists('users/bob/docs/old.md'));
        $this->assertTrue(Storage::disk('wgw_files')->exists('users/bob/docs/new.md'));

        $download = $this->getDocContent($token, '/users/bob/docs/new.md');
        $download->assertOk();
        $this->assertStringContainsString('# Old title', $download->streamedContent());

        $oldPath = $this->getDocContent($token, '/users/bob/docs/old.md');
        $oldPath->assertStatus(400)->assertJsonPath('error', 'File not found.');
    }

    public function test_admin_can_load_and_save_own_private_docs(): void
    {
        $token = $this->adminBearerToken();

        $this->uploadDoc($token, '/users/alice/docs', 'admin-note.md', "# Admin doc\n")->assertOk();

        $download = $this->getDocContent($token, '/users/alice/docs/admin-note.md');
        $download->assertOk();
        $this->assertStringContainsString('# Admin doc', $download->streamedContent());
    }
}
