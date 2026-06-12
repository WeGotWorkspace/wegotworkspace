<?php

declare(strict_types=1);

namespace Tests\Feature\Drive;

use App\Storage\WgwStorage;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\Support\DriveTestFixtures;
use Tests\Support\WgwDatabaseTestCase;

final class FilesAccessControlTest extends WgwDatabaseTestCase
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

    public function test_authenticated_user_creates_markdown_in_private_drive(): void
    {
        $token = $this->userBearerToken();

        $this->withBearer($token)->postJson('/api/v1/files/directories?path=/users/bob', [
            'name' => 'notes.md',
            'type' => 'file',
        ])->assertOk();

        app(WgwStorage::class)->files()->put('users/bob/notes.md', "# Notes\nHello drive");

        $listing = $this->withBearer($token)->getJson('/api/v1/files/children?path=/users/bob');
        $listing->assertOk()
            ->assertJsonFragment(['name' => 'notes.md', 'type' => 'file']);

        $this->assertTrue(Storage::disk('wgw_files')->exists('users/bob/notes.md'));

        $download = $this->withBearer($token)->get('/api/v1/files/content?path=/users/bob/notes.md');
        $download->assertOk();
        $this->assertStringContainsString('Hello drive', $download->streamedContent());
    }

    public function test_cross_user_create_is_denied(): void
    {
        $token = $this->userBearerToken();

        $response = $this->withBearer($token)->postJson('/api/v1/files/directories?path=/users/carol', [
            'name' => 'intrusion.md',
            'type' => 'file',
        ]);

        $this->assertAccessDenied($response);
        $this->assertFalse(Storage::disk('wgw_files')->exists('users/carol/intrusion.md'));
    }

    public function test_cross_user_delete_and_rename_are_denied(): void
    {
        $this->seedPrivateFile('carol', 'private.md', 'carol secret');
        $bobToken = $this->userBearerToken();

        $rename = $this->withBearer($bobToken)->patchJson('/api/v1/files?path=/users/carol/private.md', [
            'name' => 'hacked.md',
        ]);
        $this->assertAccessDenied($rename);

        $delete = $this->withBearer($bobToken)->deleteJson('/api/v1/files?path=/users/carol/private.md');
        $this->assertAccessDenied($delete);

        $this->assertTrue(Storage::disk('wgw_files')->exists('users/carol/private.md'));
        $carolToken = $this->carolBearerToken();
        $content = $this->withBearer($carolToken)->get('/api/v1/files/content?path=/users/carol/private.md');
        $content->assertOk();
        $this->assertSame('carol secret', $content->streamedContent());
    }

    public function test_group_member_can_crud_team_drive(): void
    {
        $token = $this->userBearerToken();

        $this->withBearer($token)->postJson('/api/v1/files/directories?path=/groups/team', [
            'name' => 'shared.md',
            'type' => 'file',
        ])->assertOk();

        $listing = $this->withBearer($token)->getJson('/api/v1/files/children?path=/groups/team');
        $listing->assertOk()->assertJsonFragment(['name' => 'shared.md', 'type' => 'file']);

        $this->withBearer($token)->patchJson('/api/v1/files?path=/groups/team/shared.md', [
            'name' => 'shared-renamed.md',
        ])->assertOk();

        $renamed = $this->withBearer($token)->getJson('/api/v1/files/children?path=/groups/team');
        $renamed->assertOk()->assertJsonFragment(['name' => 'shared-renamed.md']);

        $this->withBearer($token)->deleteJson('/api/v1/files?path=/groups/team/shared-renamed.md')
            ->assertOk();
        $this->assertFalse(Storage::disk('wgw_files')->exists('groups/team/shared-renamed.md'));
    }

    public function test_non_member_cannot_write_group_drive(): void
    {
        $token = $this->carolBearerToken();

        $create = $this->withBearer($token)->postJson('/api/v1/files/directories?path=/groups/team', [
            'name' => 'blocked.md',
            'type' => 'file',
        ]);
        $this->assertAccessDenied($create);

        $this->seedGroupFile('existing.md');
        $rename = $this->withBearer($token)->patchJson('/api/v1/files?path=/groups/team/existing.md', [
            'name' => 'stolen.md',
        ]);
        $this->assertAccessDenied($rename);

        $delete = $this->withBearer($token)->deleteJson('/api/v1/files?path=/groups/team/existing.md');
        $this->assertAccessDenied($delete);
    }

    public function test_group_read_acl_allows_member_and_denies_non_member(): void
    {
        $this->seedGroupFile('readme.md', 'team readme');
        $bobToken = $this->userBearerToken();
        $carolToken = $this->carolBearerToken();

        $memberListing = $this->withBearer($bobToken)->getJson('/api/v1/files/children?path=/groups/team');
        $memberListing->assertOk()->assertJsonFragment(['name' => 'readme.md']);

        $download = $this->withBearer($bobToken)->get('/api/v1/files/content?path=/groups/team/readme.md');
        $download->assertOk();
        $this->assertSame('team readme', $download->streamedContent());

        $nonMemberListing = $this->withBearer($carolToken)->getJson('/api/v1/files/children?path=/groups/team');
        $this->assertAccessDenied($nonMemberListing);
    }

    public function test_admin_does_not_bypass_private_path_acl(): void
    {
        $this->seedPrivateFile('carol', 'admin-proof.md', 'stay private');
        $adminToken = $this->adminBearerToken();

        $listing = $this->withBearer($adminToken)->getJson('/api/v1/files/children?path=/users/carol');
        $this->assertAccessDenied($listing);

        $download = $this->withBearer($adminToken)->get('/api/v1/files/content?path=/users/carol/admin-proof.md');
        $download->assertStatus(400);
    }

    public function test_admin_with_group_membership_can_access_team_drive(): void
    {
        $this->seedGroupFile('admin-shared.md', 'admin can read');
        $adminToken = $this->adminBearerToken();

        $this->withBearer($adminToken)->getJson('/api/v1/files/children?path=/groups/team')
            ->assertOk()
            ->assertJsonFragment(['name' => 'admin-shared.md']);
    }

    /**
     * @return iterable<string, array{0: string, 1: string, 2: array<string, mixed>|null}>
     */
    public static function guestFilesRoutesProvider(): iterable
    {
        yield 'GET context' => ['GET', '/api/v1/files/context', null];
        yield 'GET children' => ['GET', '/api/v1/files/children?path=/users/bob', null];
        yield 'GET search' => ['GET', '/api/v1/files?search=ab', null];
        yield 'POST directories' => ['POST', '/api/v1/files/directories?path=/users/bob', ['name' => 'x.md', 'type' => 'file']];
        yield 'PATCH rename' => ['PATCH', '/api/v1/files?path=/users/bob/x.md', ['name' => 'y.md']];
        yield 'DELETE single' => ['DELETE', '/api/v1/files?path=/users/bob/x.md', null];
        yield 'DELETE bulk' => ['DELETE', '/api/v1/files', ['paths' => ['/users/bob/x.md']]];
        yield 'GET content' => ['GET', '/api/v1/files/content?path=/users/bob/x.md', null];
        yield 'POST star' => ['POST', '/api/v1/files/star?path=/users/bob/x.md', null];
        yield 'DELETE star' => ['DELETE', '/api/v1/files/star?path=/users/bob/x.md', null];
        yield 'GET starred' => ['GET', '/api/v1/files/starred', null];
    }

    #[DataProvider('guestFilesRoutesProvider')]
    public function test_guest_files_routes_return_unauthorized(string $method, string $uri, ?array $body): void
    {
        if ($method === 'GET') {
            $this->getJson($uri)->assertUnauthorized();
        } elseif ($method === 'DELETE' && $body !== null) {
            $this->deleteJson($uri, $body)->assertUnauthorized();
        } elseif ($method === 'DELETE') {
            $this->deleteJson($uri)->assertUnauthorized();
        } elseif ($method === 'POST' && $body === null) {
            $this->postJson($uri)->assertUnauthorized();
        } else {
            $this->json($method, $uri, $body ?? [])->assertUnauthorized();
        }
    }

    public function test_bulk_delete_removes_multiple_allowed_paths(): void
    {
        $token = $this->userBearerToken();
        $this->createDriveFile($token, '/users/bob', 'bulk-a.md');
        $this->createDriveFile($token, '/users/bob', 'bulk-b.md');

        $this->withBearer($token)->deleteJson('/api/v1/files', [
            'paths' => ['/users/bob/bulk-a.md', '/users/bob/bulk-b.md'],
        ])->assertOk()->assertJsonPath('data', 'Deleted');

        $listing = $this->withBearer($token)->getJson('/api/v1/files/children?path=/users/bob');
        $listing->assertOk()
            ->assertJsonMissing(['name' => 'bulk-a.md'])
            ->assertJsonMissing(['name' => 'bulk-b.md']);
    }

    public function test_upload_stores_bytes_retrievable_via_get(): void
    {
        $token = $this->userBearerToken();

        $upload = $this->withBearer($token)->post('/api/v1/files/content?path=/users/bob', [
            'file' => UploadedFile::fake()->createWithContent('upload.txt', 'uploaded bytes'),
            'resumableFilename' => 'upload.txt',
            'resumableIdentifier' => 'upload-test-1',
            'resumableChunkNumber' => 1,
            'resumableTotalChunks' => 1,
        ]);
        $upload->assertOk();

        $download = $this->withBearer($token)->get('/api/v1/files/content?path=/users/bob/upload.txt');
        $download->assertOk();
        $this->assertSame('uploaded bytes', $download->streamedContent());
    }

    /**
     * @return iterable<string, array{0: string}>
     */
    public static function invalidItemNamesProvider(): iterable
    {
        yield 'dot' => ['.'];
        yield 'dotdot' => ['..'];
        yield 'slash' => ['bad/name'];
        yield 'backslash' => ['bad\\name'];
    }

    public function test_missing_item_name_returns_bad_request(): void
    {
        $response = $this->withBearer($this->userBearerToken())
            ->postJson('/api/v1/files/directories?path=/users/bob', [
                'name' => '',
                'type' => 'file',
            ]);

        $response->assertStatus(400)->assertJsonPath('error', 'Missing name.');
    }

    #[DataProvider('invalidItemNamesProvider')]
    public function test_invalid_item_names_return_bad_request(string $name): void
    {
        $token = $this->userBearerToken();

        $response = $this->withBearer($token)->postJson('/api/v1/files/directories?path=/users/bob', [
            'name' => $name,
            'type' => 'file',
        ]);

        $response->assertStatus(400)->assertJsonPath('error', 'Invalid item name.');
    }

    public function test_duplicate_create_returns_conflict(): void
    {
        $token = $this->userBearerToken();
        $this->createDriveFile($token, '/users/bob', 'dup.md');

        $duplicate = $this->withBearer($token)->postJson('/api/v1/files/directories?path=/users/bob', [
            'name' => 'dup.md',
            'type' => 'file',
        ]);

        $duplicate->assertStatus(400)->assertJsonPath('error', 'Item already exists.');
    }

    public function test_rename_to_existing_name_returns_conflict(): void
    {
        $token = $this->userBearerToken();
        $this->createDriveFile($token, '/users/bob', 'first.md');
        $this->createDriveFile($token, '/users/bob', 'second.md');

        $conflict = $this->withBearer($token)->patchJson('/api/v1/files?path=/users/bob/first.md', [
            'name' => 'second.md',
        ]);

        $conflict->assertStatus(400)->assertJsonPath('error', 'Destination already exists.');
    }

    public function test_drive_search_returns_hits_only_within_allowed_paths(): void
    {
        $this->createDriveFile($this->userBearerToken(), '/users/bob', 'findme-bob.md');
        $this->createDriveFile($this->carolBearerToken(), '/users/carol', 'findme-carol.md');

        $results = $this->withBearer($this->userBearerToken())
            ->getJson('/api/v1/files?search=findme');

        $results->assertOk();
        $names = array_column((array) $results->json('data.files'), 'name');
        $this->assertContains('findme-bob.md', $names);
        $this->assertNotContains('findme-carol.md', $names);
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
}
