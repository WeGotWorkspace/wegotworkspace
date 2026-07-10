<?php

declare(strict_types=1);

namespace Tests\Feature\Drive;

use App\Models\DriveShareGrant;
use App\Models\GroupMember;
use App\Models\Principal;
use PHPUnit\Framework\Attributes\Group;
use Tests\Support\DriveTestFixtures;
use Tests\Support\WgwDatabaseTestCase;

#[Group('MySQLParity')]
final class DriveShareGroupGrantsTest extends WgwDatabaseTestCase
{
    use DriveTestFixtures;

    private string $ownerToken;

    protected function setUp(): void
    {
        parent::setUp();
        $this->setUpDriveFixtures();
        $this->ownerToken = $this->userBearerToken();
        $this->createDriveFile($this->ownerToken, '/users/bob', 'team-doc.md');
    }

    protected function tearDown(): void
    {
        $this->tearDownDriveFixtures();
        parent::tearDown();
    }

    public function test_group_grant_allows_team_member_and_denies_non_member(): void
    {
        $this->withBearer($this->ownerToken)->postJson('/api/v1/files/shares', [
            'path' => '/users/bob/team-doc.md',
            'kind' => 'member',
            'defaultAccess' => 'view',
            'shareWith' => [
                'groups/team' => ['access' => 'view'],
            ],
        ])->assertOk()
            ->assertJsonPath('data.shareWith.groups/team.access', 'view');

        $aliceToken = $this->adminBearerToken();
        $this->withBearer($aliceToken)->get('/api/v1/files/content?path='.urlencode('/users/bob/team-doc.md'))
            ->assertOk();

        $carolToken = $this->carolBearerToken();
        $this->assertAccessDenied(
            $this->withBearer($carolToken)->get('/api/v1/files/content?path='.urlencode('/users/bob/team-doc.md'))
        );
    }

    public function test_unknown_group_slug_returns_bad_request(): void
    {
        $this->withBearer($this->ownerToken)->postJson('/api/v1/files/shares', [
            'path' => '/users/bob/team-doc.md',
            'kind' => 'member',
            'defaultAccess' => 'view',
            'shareWith' => [
                'groups/unknown-group' => ['access' => 'view'],
            ],
        ])->assertStatus(400);
    }

    public function test_patch_groups_team_null_removes_group_grant(): void
    {
        $create = $this->withBearer($this->ownerToken)->postJson('/api/v1/files/shares', [
            'path' => '/users/bob/team-doc.md',
            'kind' => 'member',
            'defaultAccess' => 'view',
            'shareWith' => [
                'groups/team' => ['access' => 'view'],
            ],
        ])->assertOk();

        $shareId = (string) $create->json('data.id');
        $updatedAt = (string) $create->json('data.updatedAt');

        $this->withBearer($this->ownerToken)->patchJson('/api/v1/files/shares/'.$shareId, [
            'updatedAt' => $updatedAt,
            'shareWith' => [
                'groups/team' => null,
            ],
        ])->assertOk()
            ->assertJsonPath('data.shareWith', null);

        $this->assertNull(
            DriveShareGrant::query()
                ->where('share_id', $shareId)
                ->where('grantee_type', 'group')
                ->where('grantee_group', 'team')
                ->first()
        );
    }

    public function test_shared_with_me_direct_grant_wins_over_group(): void
    {
        $this->withBearer($this->ownerToken)->postJson('/api/v1/files/shares', [
            'path' => '/users/bob/team-doc.md',
            'kind' => 'member',
            'defaultAccess' => 'view',
            'shareWith' => [
                'alice' => ['access' => 'full'],
                'groups/team' => ['access' => 'view'],
            ],
        ])->assertOk();

        $response = $this->withBearer($this->adminBearerToken())->getJson('/api/v1/files/shared-with-me');
        $response->assertOk()
            ->assertJsonPath('data.0.share.defaultAccess', 'full')
            ->assertJsonMissingPath('data.0.viaGroup');
    }

    public function test_shared_with_me_group_only_shows_via_group(): void
    {
        $this->addCarolToTeam();

        $this->withBearer($this->ownerToken)->postJson('/api/v1/files/shares', [
            'path' => '/users/bob/team-doc.md',
            'kind' => 'member',
            'defaultAccess' => 'view',
            'shareWith' => [
                'groups/team' => ['access' => 'edit'],
            ],
        ])->assertOk();

        $response = $this->withBearer($this->carolBearerToken())->getJson('/api/v1/files/shared-with-me');
        $response->assertOk()
            ->assertJsonPath('data.0.share.defaultAccess', 'edit')
            ->assertJsonPath('data.0.viaGroup', 'groups/team');
    }

    private function addCarolToTeam(): void
    {
        $team = Principal::query()->where('uri', 'principals/groups/team')->first();
        $carol = Principal::forUsername('carol');
        $this->assertNotNull($team);
        $this->assertNotNull($carol);

        $membership = new GroupMember;
        $membership->principal_id = (int) $team->id;
        $membership->member_id = (int) $carol->id;
        $membership->save();
    }
}
