<?php

declare(strict_types=1);

namespace Tests\Feature\Docs;

use App\Models\Principal;
use App\Storage\WgwStorage;
use Illuminate\Support\Facades\Storage;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\Support\DocsTestFixtures;
use Tests\Support\WgwDatabaseTestCase;

final class DocsAccessControlTest extends WgwDatabaseTestCase
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

    public function test_cross_user_cannot_read_private_doc(): void
    {
        $this->seedDocFile('carol', 'secret.md', 'carol-only');
        $bobToken = $this->userBearerToken();

        $response = $this->getDocContent($bobToken, '/users/carol/docs/secret.md');
        $response->assertStatus(400);

        $carolToken = $this->carolBearerToken();
        $this->getDocContent($carolToken, '/users/carol/docs/secret.md')
            ->assertOk();
        $this->assertSame('carol-only', $this->getDocContent($carolToken, '/users/carol/docs/secret.md')->streamedContent());
    }

    public function test_cross_user_cannot_upload_to_private_doc_path(): void
    {
        $bobToken = $this->userBearerToken();

        $upload = $this->uploadDoc($bobToken, '/users/carol/docs', 'intrusion.md', 'nope');
        $this->assertAccessDenied($upload);
        $this->assertFalse(Storage::disk('wgw_files')->exists('users/carol/docs/intrusion.md'));
    }

    public function test_cross_user_cannot_rename_private_doc(): void
    {
        $this->seedDocFile('carol', 'private.md', 'unchanged');
        $bobToken = $this->userBearerToken();

        $rename = $this->withBearer($bobToken)->patchJson('/api/v1/files?path=/users/carol/docs/private.md', [
            'name' => 'stolen.md',
        ]);
        $this->assertAccessDenied($rename);
        $this->assertTrue(Storage::disk('wgw_files')->exists('users/carol/docs/private.md'));
    }

    public function test_cross_user_cannot_delete_private_doc(): void
    {
        $this->seedDocFile('carol', 'private.md', 'unchanged');
        $bobToken = $this->userBearerToken();

        $delete = $this->withBearer($bobToken)->deleteJson('/api/v1/files?path=/users/carol/docs/private.md');
        $this->assertAccessDenied($delete);
        $this->assertTrue(Storage::disk('wgw_files')->exists('users/carol/docs/private.md'));
    }

    public function test_admin_cannot_bypass_private_doc_acl(): void
    {
        $this->seedDocFile('carol', 'admin-proof.md', 'stay private');
        $adminToken = $this->adminBearerToken();

        $this->getDocContent($adminToken, '/users/carol/docs/admin-proof.md')->assertStatus(400);

        $upload = $this->uploadDoc($adminToken, '/users/carol/docs', 'hack.md', 'nope');
        $this->assertAccessDenied($upload);
    }

    public function test_admin_does_not_bypass_group_collaboration_membership(): void
    {
        $otherGroup = $this->seedWgwGroup('principals/groups/other', 'Other');
        $bob = Principal::forUsername('bob');
        $this->assertNotNull($bob);
        $this->addPrincipalToGroup($otherGroup, $bob);

        $adminToken = $this->adminBearerToken();

        $this->withBearer($adminToken)
            ->get('/api/v1/files/collaboration?path=/groups/other/plan.md')
            ->assertForbidden()
            ->assertJsonPath('error', 'forbidden');
    }

    public function test_non_member_cannot_access_team_collaboration(): void
    {
        $this->seedGroupFile('team-only.md', 'team doc');
        $carolToken = $this->carolBearerToken();

        $this->withBearer($carolToken)
            ->get('/api/v1/files/collaboration?path=/groups/team/team-only.md')
            ->assertForbidden();
    }

    public function test_missing_path_on_content_returns_bad_request(): void
    {
        $token = $this->userBearerToken();

        // download()/upload() re-wrap HttpException as 404 via RuntimeException catch.
        $this->withBearer($token)->getJson('/api/v1/files/content')
            ->assertStatus(404)
            ->assertJsonPath('error', 'Missing path query parameter.');

        $this->withBearer($token)->postJson('/api/v1/files/content')
            ->assertStatus(400)
            ->assertJsonPath('error', 'Missing upload file.');
    }

    public function test_missing_path_on_collaboration_returns_bad_request(): void
    {
        $token = $this->userBearerToken();

        $this->withBearer($token)->getJson('/api/v1/files/collaboration')
            ->assertStatus(400)
            ->assertJsonPath('error', 'Missing path query parameter.');

        $this->withBearer($token)->putJson('/api/v1/files/collaboration', [
            'markdown' => '# test',
        ])
            ->assertStatus(400)
            ->assertJsonPath('error', 'Missing path query parameter.');
    }

    public function test_download_nonexistent_private_doc_returns_not_found(): void
    {
        $token = $this->userBearerToken();

        $this->getDocContent($token, '/users/bob/docs/missing.md')
            ->assertStatus(400)
            ->assertJsonPath('error', 'File not found.');
    }

    public function test_notes_directory_is_hidden_from_children_listing(): void
    {
        app(WgwStorage::class)->files()->put('users/bob/.notes/hidden-note.md', 'note body');
        app(WgwStorage::class)->files()->put('users/bob/visible.md', 'visible');

        $listing = $this->withBearer($this->userBearerToken())
            ->getJson('/api/v1/files/children?path=/users/bob');

        $listing->assertOk()->assertJsonFragment(['name' => 'visible.md']);
        $names = array_column((array) $listing->json('data.files'), 'name');
        $this->assertNotContains('.notes', $names);
    }

    /**
     * @return iterable<string, array{0: string, 1: string, 2: array<string, mixed>|null}>
     */
    public static function guestDocsRoutesProvider(): iterable
    {
        yield 'GET content' => ['GET', '/api/v1/files/content?path=/users/bob/docs/x.md', null];
        yield 'POST content' => ['POST', '/api/v1/files/content?path=/users/bob/docs', ['resumableFilename' => 'x.md']];
        yield 'GET collaboration' => ['GET', '/api/v1/files/collaboration?path=/groups/team/plan.md', null];
        yield 'PUT collaboration' => ['PUT', '/api/v1/files/collaboration?path=/groups/team/plan.md', ['markdown' => '# x']];
    }

    #[DataProvider('guestDocsRoutesProvider')]
    public function test_guest_docs_routes_return_unauthorized(string $method, string $uri, ?array $body): void
    {
        if ($method === 'GET') {
            $this->getJson($uri)->assertUnauthorized();
        } elseif ($method === 'POST' && $body === null) {
            $this->postJson($uri)->assertUnauthorized();
        } else {
            $this->json($method, $uri, $body ?? [])->assertUnauthorized();
        }
    }
}
