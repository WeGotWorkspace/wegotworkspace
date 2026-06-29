<?php

declare(strict_types=1);

namespace Tests\Feature\Shares;

use App\Mail\ShareInviteMail;
use App\Models\FileShareGrant;
use App\Storage\WgwStorage;
use App\Support\WgwSettings;
use Illuminate\Support\Facades\Mail;
use Tests\Support\DriveTestFixtures;
use Tests\Support\WgwDatabaseTestCase;

final class OwnerSharesTest extends WgwDatabaseTestCase
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

    public function test_owner_can_create_list_update_and_revoke_share(): void
    {
        app(WgwStorage::class)->files()->makeDirectory('users/bob/shared');
        $token = $this->userBearerToken();

        $create = $this->withBearer($token)->postJson('/api/v1/files/shares', [
            'path' => '/users/bob/shared',
            'publicAccess' => 'read',
        ]);
        $create->assertCreated()
            ->assertJsonPath('data.path', '/users/bob/shared')
            ->assertJsonPath('data.targetType', 'dir')
            ->assertJsonPath('data.publicAccess', 'read');
        $shareId = $create->json('data.id');
        $this->assertNotEmpty($create->json('data.token'));
        $this->assertStringContainsString('/s/', (string) $create->json('data.url'));

        $this->withBearer($token)->getJson('/api/v1/files/shares')
            ->assertOk()
            ->assertJsonPath('data.shares.0.id', $shareId);

        $this->withBearer($token)->patchJson("/api/v1/files/shares/{$shareId}", [
            'publicAccess' => 'write',
        ])->assertOk()->assertJsonPath('data.publicAccess', 'write');

        $this->withBearer($token)->deleteJson("/api/v1/files/shares/{$shareId}")
            ->assertOk()->assertJsonPath('data', 'Revoked');

        $this->withBearer($token)->getJson('/api/v1/files/shares')
            ->assertOk()->assertJsonCount(0, 'data.shares');
    }

    public function test_owner_can_share_a_single_file(): void
    {
        $this->seedPrivateFile('bob', 'report.txt', 'hello');
        $token = $this->userBearerToken();

        $this->withBearer($token)->postJson('/api/v1/files/shares', [
            'path' => '/users/bob/report.txt',
            'publicAccess' => 'read',
        ])->assertCreated()->assertJsonPath('data.targetType', 'file');
    }

    public function test_owner_cannot_share_another_users_path(): void
    {
        $this->seedPrivateFile('carol', 'secret.txt', 'classified');
        $token = $this->userBearerToken();

        $this->withBearer($token)->postJson('/api/v1/files/shares', [
            'path' => '/users/carol/secret.txt',
            'publicAccess' => 'read',
        ])->assertStatus(400)->assertJsonPath('error', 'Access denied for this path.');
    }

    public function test_creating_share_for_missing_target_returns_not_found(): void
    {
        $token = $this->userBearerToken();

        $this->withBearer($token)->postJson('/api/v1/files/shares', [
            'path' => '/users/bob/does-not-exist.txt',
            'publicAccess' => 'read',
        ])->assertStatus(404)->assertJsonPath('error', 'Target not found.');
    }

    public function test_owner_adds_and_revokes_email_grants_and_invite_is_sent(): void
    {
        Mail::fake();
        app(WgwStorage::class)->files()->makeDirectory('users/bob/team-share');
        $token = $this->userBearerToken();

        $shareId = $this->withBearer($token)->postJson('/api/v1/files/shares', [
            'path' => '/users/bob/team-share',
            'publicAccess' => 'none',
        ])->assertCreated()->json('data.id');

        $grants = $this->withBearer($token)->postJson("/api/v1/files/shares/{$shareId}/grants", [
            'emails' => ['guest@example.com'],
            'permission' => 'read',
        ]);
        $grants->assertCreated()
            ->assertJsonPath('data.grants.0.email', 'guest@example.com')
            ->assertJsonPath('data.grants.0.status', 'pending');

        Mail::assertSent(ShareInviteMail::class, 1);

        $grantId = $grants->json('data.grants.0.id');
        $this->withBearer($token)->deleteJson("/api/v1/files/shares/{$shareId}/grants/{$grantId}")
            ->assertOk()
            ->assertJsonPath('data.grants.0.status', 'revoked');

        $this->assertSame(
            FileShareGrant::STATUS_REVOKED,
            FileShareGrant::query()->where('id', $grantId)->value('status'),
        );
    }

    public function test_public_sharing_can_be_disabled_by_setting(): void
    {
        $this->setAppSetting(WgwSettings::PUBLIC_SHARES_ENABLED, false);
        app(WgwStorage::class)->files()->makeDirectory('users/bob/blocked');
        $token = $this->userBearerToken();

        $this->withBearer($token)->postJson('/api/v1/files/shares', [
            'path' => '/users/bob/blocked',
            'publicAccess' => 'read',
        ])->assertStatus(404)->assertJsonPath('error', 'Public file sharing is disabled for this site.');
    }

    public function test_owner_share_routes_require_authentication(): void
    {
        $this->getJson('/api/v1/files/shares')->assertUnauthorized();
        $this->postJson('/api/v1/files/shares', [
            'path' => '/users/bob/x',
            'publicAccess' => 'read',
        ])->assertUnauthorized();
    }
}
