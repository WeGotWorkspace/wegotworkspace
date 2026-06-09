<?php

declare(strict_types=1);

namespace Tests\Feature\Drive;

use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\File;
use Tests\Support\InteractsWithTempGitRepo;
use Tests\Support\WgwDatabaseTestCase;
use Tests\Support\WgwInstallFixture;
use Tests\Support\WgwTestDisks;

final class DriveGitVersioningTest extends WgwDatabaseTestCase
{
    use InteractsWithTempGitRepo;

    private string $dataDir = '';

    private string $installRoot = '';

    protected function setUp(): void
    {
        parent::setUp();

        if (! self::gitAvailable()) {
            $this->markTestSkipped('git binary is not available');
        }

        putenv('WGW_DISABLE_LOGIN_THROTTLE=1');
        $_ENV['WGW_DISABLE_LOGIN_THROTTLE'] = '1';

        $this->dataDir = storage_path('framework/testing/wgw-git-rest-'.uniqid('', true));
        File::ensureDirectoryExists($this->dataDir.'/files/users/alice');
        WgwTestDisks::refresh($this->dataDir);
        config(['wgw.git_versioning.enabled' => true]);
        $this->configureWgwJwtKeys();

        $this->seedWgwUser('alice', displayName: 'Alice');
    }

    protected function tearDown(): void
    {
        if ($this->dataDir !== '' && File::isDirectory($this->dataDir)) {
            File::deleteDirectory($this->dataDir);
        }
        if ($this->installRoot !== '' && File::isDirectory($this->installRoot)) {
            File::deleteDirectory($this->installRoot);
        }

        parent::tearDown();
    }

    public function test_create_empty_file_via_rest_creates_commit(): void
    {
        $token = $this->issueBearerToken();

        $this->withBearer($token)->postJson('/api/v1/files/directories?path=/users/alice', [
            'name' => 'notes.txt',
            'type' => 'file',
        ])->assertOk();

        $repoRoot = $this->dataDir.'/files/users/alice';
        $this->assertSame(1, $this->gitLogCount($repoRoot));
        $this->assertStringContainsString('alice', $this->latestCommitMessage($repoRoot));
    }

    public function test_upload_text_file_via_rest_creates_commit(): void
    {
        $token = $this->issueBearerToken();
        $upload = UploadedFile::fake()->createWithContent('upload.txt', 'uploaded content');

        $this->withBearer($token)->post('/api/v1/files/content?path=/users/alice', [
            'file' => $upload,
            'resumableFilename' => 'upload.txt',
            'resumableIdentifier' => 'upload-1',
            'resumableChunkNumber' => 1,
            'resumableTotalChunks' => 1,
        ])->assertOk();

        $repoRoot = $this->dataDir.'/files/users/alice';
        $this->assertSame(1, $this->gitLogCount($repoRoot));
        $this->assertTrue($this->fileTracked($repoRoot, 'upload.txt'));
    }

    public function test_rename_via_rest_creates_move_commit(): void
    {
        $token = $this->issueBearerToken();

        $this->withBearer($token)->postJson('/api/v1/files/directories?path=/users/alice', [
            'name' => 'welcome.txt',
            'type' => 'file',
        ])->assertOk();

        $this->withBearer($token)->patchJson('/api/v1/files?path=/users/alice/welcome.txt', [
            'name' => 'hello.txt',
        ])->assertOk();

        $repoRoot = $this->dataDir.'/files/users/alice';
        $this->assertTrue($this->fileTracked($repoRoot, 'hello.txt'));
        $this->assertFalse($this->fileTracked($repoRoot, 'welcome.txt'));
    }

    public function test_delete_via_rest_creates_deletion_commit(): void
    {
        $token = $this->issueBearerToken();

        $this->withBearer($token)->postJson('/api/v1/files/directories?path=/users/alice', [
            'name' => 'remove.txt',
            'type' => 'file',
        ])->assertOk();

        $repoRoot = $this->dataDir.'/files/users/alice';
        $this->assertTrue($this->fileTracked($repoRoot, 'remove.txt'));

        $this->withBearer($token)->deleteJson('/api/v1/files?path=/users/alice/remove.txt')
            ->assertOk();

        $this->assertFalse($this->fileTracked($repoRoot, 'remove.txt'));
        $this->assertSame(2, $this->gitLogCount($repoRoot));
    }

    public function test_webdav_and_rest_share_the_same_git_repo(): void
    {
        $this->installRoot = sys_get_temp_dir().'/wgw-git-cross-'.uniqid('', true);
        mkdir($this->installRoot, 0775, true);
        file_put_contents($this->installRoot.'/index.php', "<?php\n");
        $this->dataDir = $this->installRoot.'/wgw-content';
        mkdir($this->dataDir.'/files/users/alice', 0775, true);
        putenv('WGW_APP_ROOT='.$this->installRoot);
        $_ENV['WGW_APP_ROOT'] = $this->installRoot;
        WgwInstallFixture::markInstalled($this->installRoot, $this->dataDir, 'alice');
        config(['wgw.data_dir' => $this->dataDir]);
        WgwTestDisks::refresh($this->dataDir);
        WgwInstallFixture::forgetInstallBindings();

        $auth = 'Basic '.base64_encode('alice:secret');
        $this->call(
            'PUT',
            '/files/users/alice/from-webdav.txt',
            [],
            [],
            [],
            ['HTTP_AUTHORIZATION' => $auth],
            'via webdav',
        )->assertSuccessful();

        $token = $this->issueBearerToken();
        $upload = UploadedFile::fake()->createWithContent('from-rest.txt', 'via rest');
        $this->withBearer($token)->post('/api/v1/files/content?path=/users/alice', [
            'file' => $upload,
            'resumableFilename' => 'from-rest.txt',
            'resumableIdentifier' => 'cross-1',
            'resumableChunkNumber' => 1,
            'resumableTotalChunks' => 1,
        ])->assertOk();

        $repoRoot = $this->dataDir.'/files/users/alice';
        $this->assertSame(2, $this->gitLogCount($repoRoot));
        $this->assertTrue($this->fileTracked($repoRoot, 'from-webdav.txt'));
        $this->assertTrue($this->fileTracked($repoRoot, 'from-rest.txt'));
    }
}
