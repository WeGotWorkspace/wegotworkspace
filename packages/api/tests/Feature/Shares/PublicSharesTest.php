<?php

declare(strict_types=1);

namespace Tests\Feature\Shares;

use App\Mail\ShareInviteMail;
use App\Models\FileShare;
use App\Models\FileShareGrant;
use App\Storage\WgwStorage;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Mail;
use Tests\Support\DriveTestFixtures;
use Tests\Support\WgwDatabaseTestCase;

final class PublicSharesTest extends WgwDatabaseTestCase
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

    public function test_public_read_share_resolves_metadata_and_lists_children(): void
    {
        $storage = app(WgwStorage::class)->files();
        $storage->makeDirectory('users/bob/pub');
        $storage->put('users/bob/pub/hello.txt', 'hi there');

        $token = $this->createShare('/users/bob/pub', 'read');

        $this->getJson("/api/v1/shares/{$token}")
            ->assertOk()
            ->assertJsonPath('data.permission', 'read')
            ->assertJsonPath('data.requiresConfirmation', false)
            ->assertJsonPath('data.targetType', 'dir');

        $children = $this->getJson("/api/v1/shares/{$token}/children");
        $children->assertOk()->assertJsonFragment(['name' => 'hello.txt', 'path' => '/hello.txt']);

        $download = $this->get("/api/v1/shares/{$token}/content?path=/hello.txt");
        $download->assertOk();
        $this->assertSame('hi there', $download->streamedContent());
    }

    public function test_public_write_share_allows_upload_and_mkdir(): void
    {
        app(WgwStorage::class)->files()->makeDirectory('users/bob/dropbox');
        $token = $this->createShare('/users/bob/dropbox', 'write');

        $upload = $this->post("/api/v1/shares/{$token}/content", [
            'file' => UploadedFile::fake()->createWithContent('upload.txt', 'dropped bytes'),
            'resumableFilename' => 'upload.txt',
            'resumableChunkNumber' => 1,
            'resumableTotalChunks' => 1,
        ]);
        $upload->assertOk();
        $this->assertSame('dropped bytes', app(WgwStorage::class)->files()->get('users/bob/dropbox/upload.txt'));

        $this->postJson("/api/v1/shares/{$token}/directories", ['name' => 'sub'])
            ->assertCreated()->assertJsonPath('data', 'Created');

        $this->getJson("/api/v1/shares/{$token}/children")
            ->assertOk()->assertJsonFragment(['name' => 'sub', 'type' => 'dir']);
    }

    public function test_read_only_share_rejects_upload(): void
    {
        app(WgwStorage::class)->files()->makeDirectory('users/bob/readonly');
        $token = $this->createShare('/users/bob/readonly', 'read');

        $this->post("/api/v1/shares/{$token}/content", [
            'file' => UploadedFile::fake()->createWithContent('x.txt', 'no'),
            'resumableFilename' => 'x.txt',
            'resumableChunkNumber' => 1,
            'resumableTotalChunks' => 1,
        ])->assertStatus(400)->assertJsonPath('error', 'This share is read-only.');
    }

    public function test_private_share_requires_confirmation_then_grants_access(): void
    {
        Mail::fake();
        $storage = app(WgwStorage::class)->files();
        $storage->makeDirectory('users/bob/invited');
        $storage->put('users/bob/invited/doc.txt', 'secret doc');

        $token = $this->createShare('/users/bob/invited', 'none');
        $shareId = (string) FileShare::query()->where('token', $token)->value('id');

        // Owner invites a recipient.
        $this->withBearer($this->userBearerToken())->postJson("/api/v1/files/shares/{$shareId}/grants", [
            'emails' => ['recipient@example.com'],
            'permission' => 'read',
        ])->assertCreated();
        Mail::assertSent(ShareInviteMail::class);

        // Without a credential the share requires confirmation and access is forbidden.
        $this->getJson("/api/v1/shares/{$token}")
            ->assertOk()
            ->assertJsonPath('data.permission', 'none')
            ->assertJsonPath('data.requiresConfirmation', true);
        $this->getJson("/api/v1/shares/{$token}/children")->assertStatus(403);

        // Confirm via the emailed invite token.
        $inviteToken = (string) FileShareGrant::query()
            ->where('email', 'recipient@example.com')->value('invite_token');
        $confirm = $this->postJson('/api/v1/shares/grants/confirm', ['inviteToken' => $inviteToken]);
        $confirm->assertOk()->assertJsonPath('data.permission', 'read');
        $accessToken = (string) $confirm->json('data.accessToken');
        $this->assertNotEmpty($accessToken);

        // With the access token the recipient can browse.
        $this->withHeader('X-Wgw-Share-Access', $accessToken)
            ->getJson("/api/v1/shares/{$token}/children")
            ->assertOk()
            ->assertJsonFragment(['name' => 'doc.txt']);

        $this->withHeader('X-Wgw-Share-Access', $accessToken)
            ->getJson("/api/v1/shares/{$token}")
            ->assertOk()
            ->assertJsonPath('data.permission', 'read')
            ->assertJsonPath('data.requiresConfirmation', false);
    }

    public function test_public_self_request_sends_confirmation_email(): void
    {
        Mail::fake();
        app(WgwStorage::class)->files()->makeDirectory('users/bob/requestable');
        $token = $this->createShare('/users/bob/requestable', 'none');

        $this->postJson("/api/v1/shares/{$token}/grants", ['email' => 'visitor@example.com'])
            ->assertStatus(202)
            ->assertJsonPath('data.status', 'pending');

        Mail::assertSent(ShareInviteMail::class);
        $this->assertSame(
            FileShareGrant::STATUS_PENDING,
            FileShareGrant::query()->where('email', 'visitor@example.com')->value('status'),
        );
    }

    public function test_expired_share_returns_not_found(): void
    {
        app(WgwStorage::class)->files()->makeDirectory('users/bob/old');
        $token = $this->createShare('/users/bob/old', 'read', Carbon::now()->subDay()->toIso8601String());

        $this->getJson("/api/v1/shares/{$token}")->assertStatus(404);
        $this->getJson("/api/v1/shares/{$token}/children")->assertStatus(404);
    }

    public function test_path_traversal_outside_share_is_rejected(): void
    {
        $storage = app(WgwStorage::class)->files();
        $storage->makeDirectory('users/bob/contained');
        $storage->put('users/carol/private.txt', 'carol only');

        $token = $this->createShare('/users/bob/contained', 'read');

        $this->getJson("/api/v1/shares/{$token}/children?path=".rawurlencode('/../../carol'))
            ->assertStatus(400)->assertJsonPath('error', 'Path escapes the share.');

        $this->get("/api/v1/shares/{$token}/content?path=".rawurlencode('/../../carol/private.txt'))
            ->assertStatus(400);
    }

    private function createShare(string $path, string $publicAccess, ?string $expiresAt = null): string
    {
        $body = ['path' => $path, 'publicAccess' => $publicAccess];
        if ($expiresAt !== null) {
            $body['expiresAt'] = $expiresAt;
        }

        return (string) $this->withBearer($this->userBearerToken())
            ->postJson('/api/v1/files/shares', $body)
            ->assertCreated()
            ->json('data.token');
    }
}
