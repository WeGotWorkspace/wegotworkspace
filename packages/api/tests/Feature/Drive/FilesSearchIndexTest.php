<?php

declare(strict_types=1);

namespace Tests\Feature\Drive;

use Tests\Support\DriveTestFixtures;
use Tests\Support\WgwDatabaseTestCase;

final class FilesSearchIndexTest extends WgwDatabaseTestCase
{
    use DriveTestFixtures;

    protected function setUp(): void
    {
        parent::setUp();
        $this->setUpDriveFixtures();
    }

    protected function tearDown(): void
    {
        $this->tearDownDriveFixtures();
        parent::tearDown();
    }

    public function test_create_indexes_private_drive_file(): void
    {
        $token = $this->userBearerToken();
        $this->createDriveFile($token, '/users/bob', 'index-me.md');

        $this->assertSearchDocumentExists('users/bob/index-me.md');
    }

    public function test_rename_updates_search_index_keys(): void
    {
        $token = $this->userBearerToken();
        $this->createDriveFile($token, '/users/bob', 'index-me.md');

        $this->withBearer($token)->patchJson('/api/v1/files?path=/users/bob/index-me.md', [
            'name' => 'index-renamed.md',
        ])->assertOk();

        $this->assertSearchDocumentMissing('users/bob/index-me.md');
        $this->assertSearchDocumentExists('users/bob/index-renamed.md');
    }

    public function test_delete_removes_search_index_row(): void
    {
        $token = $this->userBearerToken();
        $this->createDriveFile($token, '/users/bob', 'index-me.md');
        $this->assertSearchDocumentExists('users/bob/index-me.md');

        $this->withBearer($token)->deleteJson('/api/v1/files?path=/users/bob/index-me.md')
            ->assertOk();

        $this->assertSearchDocumentMissing('users/bob/index-me.md');

        $search = $this->withBearer($token)->getJson('/api/v1/search/results?'.http_build_query([
            'q' => 'index-me',
            'sources' => ['file'],
            'limit' => 20,
        ]));
        $search->assertOk()->assertJsonPath('data.results', []);
    }

    public function test_group_drive_mutations_sync_search_index(): void
    {
        $token = $this->userBearerToken();

        $this->createDriveFile($token, '/groups/team', 'group-index.md');
        $this->assertSearchDocumentExists('groups/team/group-index.md');

        $this->withBearer($token)->patchJson('/api/v1/files?path=/groups/team/group-index.md', [
            'name' => 'group-renamed.md',
        ])->assertOk();

        $this->assertSearchDocumentMissing('groups/team/group-index.md');
        $this->assertSearchDocumentExists('groups/team/group-renamed.md');

        $this->withBearer($token)->deleteJson('/api/v1/files?path=/groups/team/group-renamed.md')
            ->assertOk();
        $this->assertSearchDocumentMissing('groups/team/group-renamed.md');
    }
}
