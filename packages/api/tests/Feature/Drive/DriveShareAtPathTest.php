<?php

declare(strict_types=1);

namespace Tests\Feature\Drive;

use Illuminate\Support\Carbon;
use PHPUnit\Framework\Attributes\Group;
use Tests\Support\DriveTestFixtures;
use Tests\Support\WgwDatabaseTestCase;

#[Group('MySQLParity')]
final class DriveShareAtPathTest extends WgwDatabaseTestCase
{
    use DriveTestFixtures;

    private string $ownerToken;

    protected function setUp(): void
    {
        parent::setUp();
        $this->setUpDriveFixtures();
        $this->ownerToken = $this->userBearerToken();
        $this->createDriveFile($this->ownerToken, '/users/bob', 'draft.md');
        $this->withBearer($this->ownerToken)->postJson('/api/v1/files/directories?path=/users/bob', [
            'name' => 'projects',
        ])->assertOk();
        $this->withBearer($this->ownerToken)->postJson('/api/v1/files/directories?path=/users/bob/projects', [
            'name' => 'q3',
        ])->assertOk();
        $this->createDriveFile($this->ownerToken, '/users/bob/projects/q3', 'draft.md');
    }

    protected function tearDown(): void
    {
        $this->tearDownDriveFixtures();
        parent::tearDown();
    }

    public function test_at_path_returns_direct_covering_nested_and_effective_grants(): void
    {
        $ancestor = $this->withBearer($this->ownerToken)->postJson('/api/v1/files/shares', [
            'path' => '/users/bob/projects',
            'kind' => 'member',
            'defaultAccess' => 'view',
            'shareWith' => [
                'groups/team' => ['access' => 'view'],
            ],
        ])->assertOk();

        $this->withBearer($this->ownerToken)->postJson('/api/v1/files/shares', [
            'path' => '/users/bob/projects',
            'kind' => 'public',
            'defaultAccess' => 'view',
        ])->assertOk();

        $directMember = $this->withBearer($this->ownerToken)->postJson('/api/v1/files/shares', [
            'path' => '/users/bob/projects/q3',
            'kind' => 'member',
            'defaultAccess' => 'edit',
            'shareWith' => [
                'alice' => ['access' => 'full'],
                'carol@example.com' => ['access' => 'view'],
            ],
        ])->assertOk();

        $directPublic = $this->withBearer($this->ownerToken)->postJson('/api/v1/files/shares', [
            'path' => '/users/bob/projects/q3',
            'kind' => 'public',
            'defaultAccess' => 'view',
        ])->assertOk();

        $nested = $this->withBearer($this->ownerToken)->postJson('/api/v1/files/shares', [
            'path' => '/users/bob/projects/q3/draft.md',
            'kind' => 'member',
            'defaultAccess' => 'view',
            'shareWith' => ['carol' => ['access' => 'view']],
        ])->assertOk();

        $response = $this->withBearer($this->ownerToken)->getJson(
            '/api/v1/files/shares/at-path?path='.urlencode('/users/bob/projects/q3')
        );
        $response->assertOk()
            ->assertJsonPath('data.path', '/users/bob/projects/q3');

        $directIds = array_column((array) $response->json('data.directShares'), 'share');
        $directShareIds = array_column($directIds, 'id');
        $this->assertContains((string) $directPublic->json('data.id'), $directShareIds);
        $this->assertContains((string) $directMember->json('data.id'), $directShareIds);
        $this->assertCount(2, $directShareIds);

        $coveringIds = array_column((array) $response->json('data.coveringShares'), 'share');
        $this->assertSame(
            (string) $ancestor->json('data.id'),
            (string) ($coveringIds[0]['id'] ?? '')
        );

        $nestedIds = array_column((array) $response->json('data.nestedShares'), 'share');
        $this->assertSame(
            (string) $nested->json('data.id'),
            (string) ($nestedIds[0]['id'] ?? '')
        );

        $effective = (array) $response->json('data.effectiveGrants');
        $principals = array_column($effective, 'principal');
        $this->assertContains('alice', $principals);
        $this->assertContains('groups/team', $principals);
        $this->assertContains('carol@example.com', $principals);

        $directMember->assertJsonMissingPath('data.shareWith.carol@example.com');

        $publicShares = (array) $response->json('data.publicShares');
        $this->assertCount(2, $publicShares);
    }

    public function test_expired_covering_share_visible_but_excluded_from_effective_grants(): void
    {
        $expired = $this->withBearer($this->ownerToken)->postJson('/api/v1/files/shares', [
            'path' => '/users/bob/projects',
            'kind' => 'member',
            'defaultAccess' => 'view',
            'expiresAt' => Carbon::now()->subHour()->toISOString(),
            'shareWith' => ['alice' => ['access' => 'view']],
        ])->assertOk();

        $response = $this->withBearer($this->ownerToken)->getJson(
            '/api/v1/files/shares/at-path?path='.urlencode('/users/bob/projects/q3/draft.md')
        );
        $response->assertOk()
            ->assertJsonPath('data.coveringShares.0.status', 'expired')
            ->assertJsonPath('data.coveringShares.0.share.id', (string) $expired->json('data.id'));

        $principals = array_column((array) $response->json('data.effectiveGrants'), 'principal');
        $this->assertNotContains('alice', $principals);
    }

    public function test_pending_email_only_in_effective_grants_not_share_with(): void
    {
        $this->withBearer($this->ownerToken)->postJson('/api/v1/files/shares', [
            'path' => '/users/bob/projects/q3/draft.md',
            'kind' => 'member',
            'defaultAccess' => 'view',
            'shareWith' => [
                'alice' => ['access' => 'view'],
                'pending@example.com' => ['access' => 'view'],
            ],
        ])->assertOk()
            ->assertJsonMissingPath('data.shareWith.pending@example.com');

        $response = $this->withBearer($this->ownerToken)->getJson(
            '/api/v1/files/shares/at-path?path='.urlencode('/users/bob/projects/q3/draft.md')
        );
        $response->assertOk();
        $principals = array_column((array) $response->json('data.effectiveGrants'), 'principal');
        $this->assertContains('pending@example.com', $principals);
    }

    public function test_non_owner_gets_forbidden(): void
    {
        $this->withBearer($this->carolBearerToken())->getJson(
            '/api/v1/files/shares/at-path?path='.urlencode('/users/bob/projects/q3/draft.md')
        )->assertStatus(403);
    }

    public function test_at_path_route_not_shadowed_by_share_id_param(): void
    {
        $this->withBearer($this->ownerToken)->getJson(
            '/api/v1/files/shares/at-path?path='.urlencode('/users/bob/projects/q3/draft.md')
        )->assertOk()
            ->assertJsonPath('data.path', '/users/bob/projects/q3/draft.md');
    }
}
