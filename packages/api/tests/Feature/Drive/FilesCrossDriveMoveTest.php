<?php

declare(strict_types=1);

namespace Tests\Feature\Drive;

use Illuminate\Support\Facades\Storage;
use Tests\Support\DriveTestFixtures;
use Tests\Support\WgwDatabaseTestCase;

final class FilesCrossDriveMoveTest extends WgwDatabaseTestCase
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

    public function test_member_moves_between_private_and_group_drive(): void
    {
        $token = $this->userBearerToken();
        $this->createDriveFile($token, '/users/bob', 'local.md');

        $toGroup = $this->withBearer($token)->patchJson('/api/v1/files?path=/users/bob/local.md', [
            'name' => 'local.md',
            'destination' => '/groups/team',
        ]);
        $toGroup->assertOk();

        $this->assertFalse(Storage::disk('wgw_files')->exists('users/bob/local.md'));
        $this->assertTrue(Storage::disk('wgw_files')->exists('groups/team/local.md'));

        $toPrivate = $this->withBearer($token)->patchJson('/api/v1/files?path=/groups/team/local.md', [
            'name' => 'local.md',
            'destination' => '/users/bob',
        ]);
        $toPrivate->assertOk();

        $this->assertTrue(Storage::disk('wgw_files')->exists('users/bob/local.md'));
        $this->assertFalse(Storage::disk('wgw_files')->exists('groups/team/local.md'));
    }

    public function test_non_member_cannot_move_into_group_drive(): void
    {
        $this->createDriveFile($this->carolBearerToken(), '/users/carol', 'carol-local.md');

        $response = $this->withBearer($this->carolBearerToken())
            ->patchJson('/api/v1/files?path=/users/carol/carol-local.md', [
                'name' => 'carol-local.md',
                'destination' => '/groups/team',
            ]);

        $this->assertAccessDenied($response);
        $this->assertTrue(Storage::disk('wgw_files')->exists('users/carol/carol-local.md'));
    }

    public function test_non_member_cannot_move_out_of_group_drive(): void
    {
        $this->createDriveFile($this->userBearerToken(), '/groups/team', 'team-only.md');

        $response = $this->withBearer($this->carolBearerToken())
            ->patchJson('/api/v1/files?path=/groups/team/team-only.md', [
                'name' => 'team-only.md',
                'destination' => '/users/carol',
            ]);

        $this->assertAccessDenied($response);
        $this->assertTrue(Storage::disk('wgw_files')->exists('groups/team/team-only.md'));
    }
}
