<?php

declare(strict_types=1);

namespace Tests\Feature\Dav;

use Illuminate\Support\Facades\Storage;
use Tests\Support\InteractsWithTempGitRepo;
use Tests\Support\WgwDatabaseTestCase;
use Tests\Support\WgwInstallFixture;
use Tests\Support\WgwTestDisks;

final class SabreWebdavGitVersioningTest extends WgwDatabaseTestCase
{
    use InteractsWithTempGitRepo;

    private string $dataDir;

    private string $installRoot;

    protected function setUp(): void
    {
        parent::setUp();

        if (! self::gitAvailable()) {
            $this->markTestSkipped('git binary is not available');
        }

        $this->seedWgwUser('alice', displayName: 'Alice');

        $this->installRoot = sys_get_temp_dir().'/wgw-git-dav-'.uniqid('', true);
        mkdir($this->installRoot, 0775, true);
        file_put_contents($this->installRoot.'/index.php', "<?php\n");
        $this->dataDir = $this->installRoot.'/wgw-content';
        mkdir($this->dataDir.'/files/users/alice', 0775, true);
        putenv('WGW_APP_ROOT='.$this->installRoot);
        $_ENV['WGW_APP_ROOT'] = $this->installRoot;
        WgwInstallFixture::markInstalled($this->installRoot, $this->dataDir, 'alice');

        config([
            'wgw.data_dir' => $this->dataDir,
            'wgw.git_versioning.enabled' => true,
        ]);
        WgwTestDisks::refresh($this->dataDir);
        WgwInstallFixture::forgetInstallBindings();
    }

    public function test_put_text_file_creates_git_commit_with_authenticated_user(): void
    {
        $auth = 'Basic '.base64_encode('alice:secret');
        $payload = 'hello git versioning';

        $this->call(
            'PUT',
            '/files/users/alice/readme.txt',
            [],
            [],
            [],
            ['HTTP_AUTHORIZATION' => $auth],
            $payload,
        )->assertSuccessful();

        $repoRoot = $this->dataDir.'/files/users/alice';
        $this->assertDirectoryExists($repoRoot.'/.git');
        $this->assertSame(1, $this->gitLogCount($repoRoot));
        $this->assertStringContainsString('alice', $this->latestCommitMessage($repoRoot));
        $this->assertStringContainsString('alice', $this->latestCommitAuthor($repoRoot));
    }

    public function test_put_update_creates_second_commit(): void
    {
        $auth = 'Basic '.base64_encode('alice:secret');
        $repoRoot = $this->dataDir.'/files/users/alice';

        $this->call('PUT', '/files/users/alice/readme.txt', [], [], [], ['HTTP_AUTHORIZATION' => $auth], 'v1')
            ->assertSuccessful();
        $this->call('PUT', '/files/users/alice/readme.txt', [], [], [], ['HTTP_AUTHORIZATION' => $auth], 'v2')
            ->assertSuccessful();

        $this->assertSame(2, $this->gitLogCount($repoRoot));
    }

    public function test_put_over_max_size_does_not_commit(): void
    {
        $auth = 'Basic '.base64_encode('alice:secret');
        $repoRoot = $this->dataDir.'/files/users/alice';
        $payload = str_repeat('x', (8 * 1024 * 1024) + 1);

        $this->call(
            'PUT',
            '/files/users/alice/large.txt',
            [],
            [],
            [],
            ['HTTP_AUTHORIZATION' => $auth],
            $payload,
        )->assertSuccessful();

        $this->assertSame(0, $this->gitLogCount($repoRoot));
    }

    public function test_put_binary_file_does_not_commit(): void
    {
        $auth = 'Basic '.base64_encode('alice:secret');
        $repoRoot = $this->dataDir.'/files/users/alice';

        $this->call(
            'PUT',
            '/files/users/alice/binary.bin',
            [],
            [],
            [],
            ['HTTP_AUTHORIZATION' => $auth],
            "\x00\x01\x02\x03",
        )->assertSuccessful();

        $this->assertSame(0, $this->gitLogCount($repoRoot));
    }

    public function test_delete_creates_deletion_commit(): void
    {
        $auth = 'Basic '.base64_encode('alice:secret');
        $repoRoot = $this->dataDir.'/files/users/alice';
        Storage::disk('wgw_files')->put('users/alice/remove.txt', 'bye');

        $this->call('PUT', '/files/users/alice/remove.txt', [], [], [], ['HTTP_AUTHORIZATION' => $auth], 'bye')
            ->assertSuccessful();
        $this->assertTrue($this->fileTracked($repoRoot, 'remove.txt'));

        $this->call('DELETE', '/files/users/alice/remove.txt', [], [], [], ['HTTP_AUTHORIZATION' => $auth])
            ->assertSuccessful();

        $this->assertSame(2, $this->gitLogCount($repoRoot));
        $this->assertFalse($this->fileTracked($repoRoot, 'remove.txt'));
    }

    public function test_move_creates_rename_commit(): void
    {
        $auth = 'Basic '.base64_encode('alice:secret');
        $repoRoot = $this->dataDir.'/files/users/alice';

        $this->call('PUT', '/files/users/alice/old.txt', [], [], [], ['HTTP_AUTHORIZATION' => $auth], 'content')
            ->assertSuccessful();

        $this->call(
            'MOVE',
            '/files/users/alice/old.txt',
            [],
            [],
            [],
            [
                'HTTP_AUTHORIZATION' => $auth,
                'HTTP_DESTINATION' => 'http://localhost/files/users/alice/new.txt',
            ],
        )->assertSuccessful();

        $this->assertFalse($this->fileTracked($repoRoot, 'old.txt'));
        $this->assertTrue($this->fileTracked($repoRoot, 'new.txt'));
    }
}
