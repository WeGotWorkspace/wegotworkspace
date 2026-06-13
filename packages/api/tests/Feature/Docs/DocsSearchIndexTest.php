<?php

declare(strict_types=1);

namespace Tests\Feature\Docs;

use Tests\Support\DocsTestFixtures;
use Tests\Support\WgwDatabaseTestCase;

final class DocsSearchIndexTest extends WgwDatabaseTestCase
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

    public function test_upload_indexes_markdown_document(): void
    {
        $token = $this->userBearerToken();

        $this->uploadDoc($token, '/users/bob/docs', 'index-me.md', "# Indexed\n")->assertOk();

        $this->assertSearchDocumentExists('users/bob/docs/index-me.md');
    }

    public function test_rename_updates_search_index_for_docs_path(): void
    {
        $token = $this->userBearerToken();
        $this->uploadDoc($token, '/users/bob/docs', 'index-me.md', "# Indexed\n")->assertOk();
        $this->assertSearchDocumentExists('users/bob/docs/index-me.md');

        $this->withBearer($token)->patchJson('/api/v1/files?path=/users/bob/docs/index-me.md', [
            'name' => 'index-renamed.md',
        ])->assertOk();

        $this->assertSearchDocumentMissing('users/bob/docs/index-me.md');
        $this->assertSearchDocumentExists('users/bob/docs/index-renamed.md');
    }

    public function test_delete_removes_docs_file_from_search_index(): void
    {
        $token = $this->userBearerToken();
        $this->uploadDoc($token, '/users/bob/docs', 'index-me.md', "# Indexed\n")->assertOk();
        $this->assertSearchDocumentExists('users/bob/docs/index-me.md');

        $this->withBearer($token)->deleteJson('/api/v1/files?path=/users/bob/docs/index-me.md')
            ->assertOk();

        $this->assertSearchDocumentMissing('users/bob/docs/index-me.md');
    }
}
