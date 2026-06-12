<?php

declare(strict_types=1);

namespace Tests\Feature\Docs;

use Illuminate\Support\Facades\File;
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

    public function test_cross_user_private_doc_read_is_denied(): void
    {
        $path = $this->seedDocFile('carol', 'private.md', 'carol secret');
        $bobToken = $this->userBearerToken();

        $this->loadDocContent($bobToken, $path)
            ->assertStatus(400)
            ->assertJsonPath('error', 'Access denied for this path.');
    }

    /**
     * Production quirk: directory create falls back to caller home when parent path is disallowed.
     */
    public function test_cross_user_private_doc_create_falls_back_to_own_drive(): void
    {
        $bobToken = $this->userBearerToken();

        $this->withBearer($bobToken)->postJson('/api/v1/files/directories?path=/users/carol/docs', [
            'name' => 'intrusion.md',
            'type' => 'file',
        ])->assertOk();

        $this->assertFalse(Storage::disk('wgw_files')->exists('users/carol/docs/intrusion.md'));
        $this->assertTrue(Storage::disk('wgw_files')->exists('users/bob/intrusion.md'));
    }

    /**
     * Production quirk: content upload falls back to the caller's home when parent path is disallowed.
     */
    public function test_cross_user_content_upload_falls_back_to_own_drive(): void
    {
        $bobToken = $this->userBearerToken();

        $response = $this->uploadDoc($bobToken, '/users/carol/docs', 'intrusion.md', '# Nope');
        $response->assertOk();
        $this->assertFalse(Storage::disk('wgw_files')->exists('users/carol/docs/intrusion.md'));
        $this->assertTrue(Storage::disk('wgw_files')->exists('users/bob/intrusion.md'));
    }

    public function test_cross_user_private_doc_rename_and_delete_are_denied(): void
    {
        $path = $this->seedDocFile('carol', 'private.md', 'carol secret');
        $bobToken = $this->userBearerToken();

        $rename = $this->withBearer($bobToken)->patchJson('/api/v1/files?path='.$path, [
            'name' => 'hacked.md',
        ]);
        $this->assertAccessDenied($rename);

        $delete = $this->withBearer($bobToken)->deleteJson('/api/v1/files?path='.$path);
        $this->assertAccessDenied($delete);

        $this->assertTrue(Storage::disk('wgw_files')->exists('users/carol/docs/private.md'));

        $carolToken = $this->carolBearerToken();
        $content = $this->loadDocContent($carolToken, $path);
        $content->assertOk();
        $this->assertSame('carol secret', $content->streamedContent());
    }

    public function test_admin_cannot_access_other_users_private_doc(): void
    {
        $path = $this->seedDocFile('bob', 'secret.md', 'bob only');
        $aliceToken = $this->adminBearerToken();

        $this->loadDocContent($aliceToken, $path)
            ->assertStatus(400)
            ->assertJsonPath('error', 'Access denied for this path.');
    }

    public function test_hidden_notes_paths_excluded_from_drive_children_listing(): void
    {
        $token = $this->userBearerToken();
        $notesDir = $this->driveDataDir.'/files/users/bob/.notes/Drafts';
        File::ensureDirectoryExists($notesDir);
        File::ensureDirectoryExists($this->driveDataDir.'/files/users/bob/docs');
        File::put($notesDir.'/visible.md', "title: Visible\n----\nHello");
        File::put($this->driveDataDir.'/files/users/bob/docs/visible.md', '# Docs file');

        $listing = $this->withBearer($token)->getJson('/api/v1/files/children?path=/users/bob');
        $listing->assertOk();
        $names = array_column((array) $listing->json('data.files'), 'name');
        $this->assertContains('docs', $names);
        $this->assertNotContains('.notes', $names);
    }

    #[DataProvider('guestProtectedDocsRoutesProvider')]
    public function test_guest_cannot_access_docs_file_endpoints(string $method, string $uri): void
    {
        $this->json($method, $uri)->assertUnauthorized();
    }

    /**
     * @return array<string, array{0: string, 1: string}>
     */
    public static function guestProtectedDocsRoutesProvider(): array
    {
        $docPath = urlencode('/users/bob/docs/report.md');
        $groupPath = urlencode('/groups/team/plan.md');

        return [
            'content get' => ['GET', '/api/v1/files/content?path='.$docPath],
            'content post' => ['POST', '/api/v1/files/content?path='.$docPath],
            'collaboration get' => ['GET', '/api/v1/files/collaboration?path='.$groupPath],
            'collaboration put' => ['PUT', '/api/v1/files/collaboration?path='.$groupPath],
        ];
    }
}
