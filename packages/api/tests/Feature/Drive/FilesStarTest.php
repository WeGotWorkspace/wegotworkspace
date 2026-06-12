<?php

declare(strict_types=1);

namespace Tests\Feature\Drive;

use App\Models\GroupMember;
use App\Models\Principal;
use Illuminate\Support\Facades\DB;
use Tests\Support\DriveTestFixtures;
use Tests\Support\WgwDatabaseTestCase;

final class FilesStarTest extends WgwDatabaseTestCase
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

    public function test_star_and_unstar_persist_in_starred_list(): void
    {
        $token = $this->userBearerToken();
        $path = $this->seedPrivateFile('bob', 'doc.md');

        $this->withBearer($token)->postJson('/api/v1/files/star?path='.$path)
            ->assertOk()
            ->assertJsonPath('data', 'Updated');

        $starred = $this->withBearer($token)->getJson('/api/v1/files/starred');
        $starred->assertOk()->assertJsonPath('data.paths', [$path]);

        $this->assertNotNull(
            DB::connection('wgw')->table('drive_starred_items')
                ->where('username', 'bob')
                ->where('path', $path)
                ->first()
        );

        $this->withBearer($token)->deleteJson('/api/v1/files/star?path='.$path)
            ->assertOk();

        $this->withBearer($token)->getJson('/api/v1/files/starred')
            ->assertOk()
            ->assertJsonPath('data.paths', []);

        $this->assertNull(
            DB::connection('wgw')->table('drive_starred_items')
                ->where('username', 'bob')
                ->where('path', $path)
                ->first()
        );
    }

    public function test_unstar_is_idempotent(): void
    {
        $token = $this->userBearerToken();
        $path = $this->seedPrivateFile('bob', 'doc.md');

        $this->withBearer($token)->deleteJson('/api/v1/files/star?path='.$path)
            ->assertOk();

        $this->withBearer($token)->getJson('/api/v1/files/starred')
            ->assertOk()
            ->assertJsonPath('data.paths', []);
    }

    public function test_star_on_inaccessible_path_is_denied(): void
    {
        $this->seedPrivateFile('carol', 'secret.md');

        $response = $this->withBearer($this->userBearerToken())
            ->postJson('/api/v1/files/star?path=/users/carol/secret.md');

        $this->assertAccessDenied($response);
    }

    public function test_cannot_star_root_path(): void
    {
        $response = $this->withBearer($this->userBearerToken())
            ->postJson('/api/v1/files/star?path=/./');

        $response->assertStatus(400)->assertJsonPath('error', 'Cannot star root path.');
    }

    public function test_starred_list_omits_paths_after_group_access_is_lost(): void
    {
        $token = $this->userBearerToken();
        $path = '/groups/team/lost-access.md';
        $this->createDriveFile($token, '/groups/team', 'lost-access.md');

        $this->withBearer($token)->postJson('/api/v1/files/star?path='.$path)->assertOk();
        $this->withBearer($token)->getJson('/api/v1/files/starred')
            ->assertOk()
            ->assertJsonPath('data.paths', [$path]);

        $bob = Principal::forUsername('bob');
        $team = Principal::query()->where('uri', 'principals/groups/team')->first();
        $this->assertNotNull($bob);
        $this->assertNotNull($team);

        GroupMember::query()
            ->where('principal_id', $team->id)
            ->where('member_id', $bob->id)
            ->delete();

        $this->withBearer($token)->getJson('/api/v1/files/starred')
            ->assertOk()
            ->assertJsonPath('data.paths', []);
    }
}
