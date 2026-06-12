<?php

declare(strict_types=1);

namespace Tests\Feature\Drive;

use Illuminate\Support\Facades\Storage;
use Tests\Support\DriveTestFixtures;
use Tests\Support\WgwDatabaseTestCase;

final class FilesTrashTest extends WgwDatabaseTestCase
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

    public function test_move_to_trash_retains_blob_and_updates_listings(): void
    {
        $token = $this->userBearerToken();
        $this->createDriveFile($token, '/users/bob', 'report.md');
        $this->ensureTrashDirectory($token, 'bob');

        $this->withBearer($token)->patchJson('/api/v1/files?path=/users/bob/report.md', [
            'name' => 'report.md',
            'destination' => '/users/bob/.Trash',
        ])->assertOk();

        $this->assertTrue(Storage::disk('wgw_files')->exists('users/bob/.Trash/report.md'));

        $source = $this->withBearer($token)->getJson('/api/v1/files/children?path=/users/bob');
        $source->assertOk()->assertJsonMissing(['name' => 'report.md']);

        $trash = $this->withBearer($token)->getJson('/api/v1/files/children?path=/users/bob/.Trash');
        $trash->assertOk()->assertJsonFragment(['name' => 'report.md', 'type' => 'file']);
    }

    public function test_permanent_delete_from_trash_removes_file_and_index(): void
    {
        $token = $this->userBearerToken();
        $this->createDriveFile($token, '/users/bob', 'old.md');
        $this->ensureTrashDirectory($token, 'bob');

        $this->withBearer($token)->patchJson('/api/v1/files?path=/users/bob/old.md', [
            'name' => 'old.md',
            'destination' => '/users/bob/.Trash',
        ])->assertOk();

        $this->withBearer($token)->deleteJson('/api/v1/files?path=/users/bob/.Trash/old.md')
            ->assertOk();

        $this->assertFalse(Storage::disk('wgw_files')->exists('users/bob/.Trash/old.md'));
        $this->assertSearchDocumentMissing('users/bob/.Trash/old.md');

        $this->withBearer($token)->get('/api/v1/files/content?path=/users/bob/.Trash/old.md')
            ->assertStatus(400)
            ->assertJsonPath('error', 'File not found.');

        $listing = $this->withBearer($token)->getJson('/api/v1/files/children?path=/users/bob/.Trash');
        $listing->assertOk()->assertJsonMissing(['name' => 'old.md']);
    }
}
