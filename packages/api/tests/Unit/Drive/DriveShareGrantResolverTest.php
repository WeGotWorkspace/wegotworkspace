<?php

declare(strict_types=1);

namespace Tests\Unit\Drive;

use App\Models\DriveShare;
use App\Models\DriveShareGrant;
use App\Services\Drive\DriveShareGrantResolver;
use Illuminate\Support\Carbon;
use Illuminate\Support\Str;
use Tests\Support\DriveTestFixtures;
use Tests\Support\WgwDatabaseTestCase;

final class DriveShareGrantResolverTest extends WgwDatabaseTestCase
{
    use DriveTestFixtures;

    private DriveShareGrantResolver $resolver;

    protected function setUp(): void
    {
        parent::setUp();
        $this->setUpDriveFixtures();
        $this->resolver = app(DriveShareGrantResolver::class);
    }

    protected function tearDown(): void
    {
        $this->tearDownDriveFixtures();
        parent::tearDown();
    }

    public function test_resolves_most_specific_matching_path_grant(): void
    {
        $parent = $this->seedShare('/users/bob/projects/q3', 'full');
        $child = $this->seedShare('/users/bob/projects/q3/draft', 'view');

        $this->seedUserGrant($parent, 'alice', 'full');
        $this->seedUserGrant($child, 'alice', 'view');

        $resolved = $this->resolver->resolveMemberGrant('alice', '/users/bob/projects/q3/draft/plan.md');

        $this->assertNotNull($resolved);
        $this->assertSame('/users/bob/projects/q3/draft', $resolved['rootPath']);
        $this->assertSame('view', $resolved['access']);
    }

    public function test_resolves_parent_grant_when_child_root_does_not_match(): void
    {
        $parent = $this->seedShare('/users/bob/projects/q3', 'full');
        $child = $this->seedShare('/users/bob/projects/q3/draft', 'view');

        $this->seedUserGrant($parent, 'alice', 'full');
        $this->seedUserGrant($child, 'alice', 'view');

        $resolved = $this->resolver->resolveMemberGrant('alice', '/users/bob/projects/q3/plan.md');

        $this->assertNotNull($resolved);
        $this->assertSame('/users/bob/projects/q3', $resolved['rootPath']);
        $this->assertSame('full', $resolved['access']);
    }

    public function test_returns_null_when_no_grant_matches_requested_path(): void
    {
        $share = $this->seedShare('/users/bob/projects/q3', 'view');
        $this->seedUserGrant($share, 'alice', 'view');

        $this->assertNull($this->resolver->resolveMemberGrant('alice', '/users/bob/private/plan.md'));
    }

    private function seedShare(string $path, string $defaultAccess): DriveShare
    {
        $share = new DriveShare;
        $share->id = (string) Str::uuid();
        $share->path = $path;
        $share->owner_username = 'bob';
        $share->kind = 'member';
        $share->default_access = $defaultAccess;
        $share->expires_at = Carbon::now()->addDay();
        $share->save();

        return $share;
    }

    private function seedUserGrant(DriveShare $share, string $username, string $access): void
    {
        $grant = new DriveShareGrant;
        $grant->id = (string) Str::uuid();
        $grant->share_id = (string) $share->id;
        $grant->grantee_type = 'user';
        $grant->grantee_user = $username;
        $grant->access = $access;
        $grant->status = 'active';
        $grant->save();
    }
}
