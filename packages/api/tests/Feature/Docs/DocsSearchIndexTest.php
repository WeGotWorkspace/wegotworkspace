<?php

declare(strict_types=1);

namespace Tests\Feature\Docs;

use App\Services\Search\SearchIndexerService;
use App\Storage\WgwStorage;
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

    public function test_uploading_markdown_doc_adds_search_index_row(): void
    {
        $token = $this->userBearerToken();

        $this->uploadDoc($token, '/users/bob/docs', 'indexed.md', "# Searchable\n\nFind me.")
            ->assertOk();

        $this->assertSearchDocumentExists('users/bob/docs/indexed.md');
    }

    public function test_renaming_doc_updates_search_index_keys(): void
    {
        $token = $this->userBearerToken();
        $path = $this->seedDocFile('bob', 'before.md', '# Before rename');

        app(SearchIndexerService::class)->indexFileStorageKey('users/bob/docs/before.md');
        $this->assertSearchDocumentExists('users/bob/docs/before.md');

        $this->withBearer($token)->patchJson('/api/v1/files?path='.$path, [
            'name' => 'after.md',
        ])->assertOk();

        $this->assertSearchDocumentMissing('users/bob/docs/before.md');
        $this->assertSearchDocumentExists('users/bob/docs/after.md');
    }

    public function test_deleting_doc_removes_search_index_row(): void
    {
        $token = $this->userBearerToken();
        $path = $this->seedDocFile('bob', 'delete-me.md', '# Delete me');

        app(SearchIndexerService::class)->indexFileStorageKey('users/bob/docs/delete-me.md');
        $this->assertSearchDocumentExists('users/bob/docs/delete-me.md');

        $this->withBearer($token)->deleteJson('/api/v1/files?path='.$path)
            ->assertOk();

        $this->assertSearchDocumentMissing('users/bob/docs/delete-me.md');
        $this->assertFalse(app(WgwStorage::class)->files()->exists('users/bob/docs/delete-me.md'));
    }
}
