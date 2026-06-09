<?php

declare(strict_types=1);

namespace Tests\Unit\Services\Drive;

use App\Services\Drive\DriveGitVersioningService;
use App\Storage\WgwStorage;
use Illuminate\Support\Facades\File;
use PHPUnit\Framework\Attributes\Test;
use Tests\Support\InteractsWithTempGitRepo;
use Tests\Support\WgwDatabaseTestCase;
use Tests\Support\WgwTestDisks;

final class DriveGitVersioningServiceTest extends WgwDatabaseTestCase
{
    use InteractsWithTempGitRepo;

    private string $dataDir;

    private DriveGitVersioningService $service;

    protected function setUp(): void
    {
        parent::setUp();

        if (! self::gitAvailable()) {
            $this->markTestSkipped('git binary is not available');
        }

        $this->dataDir = storage_path('framework/testing/wgw-git-svc-'.uniqid('', true));
        File::ensureDirectoryExists($this->dataDir.'/files/users/alice');
        WgwTestDisks::refresh($this->dataDir);
        config(['wgw.git_versioning.enabled' => true]);

        $this->seedWgwUser('alice', displayName: 'Alice');

        $this->service = app(DriveGitVersioningService::class);
    }

    protected function tearDown(): void
    {
        if ($this->dataDir !== '' && File::isDirectory($this->dataDir)) {
            File::deleteDirectory($this->dataDir);
        }

        parent::tearDown();
    }

    #[Test]
    public function record_dav_upsert_commits_versioned_file(): void
    {
        app(WgwStorage::class)->files()->put('users/alice/a.txt', 'hello');

        $this->service->recordDavUpsert('files/users/alice/a.txt', 'principals/alice');

        $repoRoot = $this->dataDir.'/files/users/alice';
        $this->assertSame(1, $this->gitLogCount($repoRoot));
        $this->assertStringContainsString('alice', $this->latestCommitMessage($repoRoot));
    }

    #[Test]
    public function record_dav_upsert_ignores_non_files_paths(): void
    {
        app(WgwStorage::class)->files()->put('users/alice/a.txt', 'hello');

        $this->service->recordDavUpsert('calendars/alice/default/event.ics', 'principals/alice');

        $repoRoot = $this->dataDir.'/files/users/alice';
        $this->assertSame(0, $this->gitLogCount($repoRoot));
    }

    #[Test]
    public function record_dav_upsert_skips_when_disabled(): void
    {
        config(['wgw.git_versioning.enabled' => false]);
        app(WgwStorage::class)->files()->put('users/alice/a.txt', 'hello');

        $this->service->recordDavUpsert('files/users/alice/a.txt', 'principals/alice');

        $repoRoot = $this->dataDir.'/files/users/alice';
        $this->assertDirectoryDoesNotExist($repoRoot.'/.git');
    }

    #[Test]
    public function record_dav_upsert_skips_without_principal(): void
    {
        app(WgwStorage::class)->files()->put('users/alice/a.txt', 'hello');

        $this->service->recordDavUpsert('files/users/alice/a.txt', null);

        $repoRoot = $this->dataDir.'/files/users/alice';
        $this->assertSame(0, $this->gitLogCount($repoRoot));
    }

    #[Test]
    public function record_storage_key_upsert_commits_file(): void
    {
        app(WgwStorage::class)->files()->put('users/alice/rest.txt', 'from rest');

        $this->service->recordUpsert('users/alice/rest.txt', 'alice');

        $repoRoot = $this->dataDir.'/files/users/alice';
        $this->assertSame(1, $this->gitLogCount($repoRoot));
        $this->assertSame('Alice <alice@wgw.local>', $this->latestCommitAuthor($repoRoot));
    }

    #[Test]
    public function record_delete_commits_removal(): void
    {
        app(WgwStorage::class)->files()->put('users/alice/remove.txt', 'bye');
        $this->service->recordUpsert('users/alice/remove.txt', 'alice');
        app(WgwStorage::class)->files()->delete('users/alice/remove.txt');

        $this->service->recordDelete('users/alice/remove.txt', 'alice');

        $repoRoot = $this->dataDir.'/files/users/alice';
        $this->assertSame(2, $this->gitLogCount($repoRoot));
        $this->assertFalse($this->fileTracked($repoRoot, 'remove.txt'));
    }

    #[Test]
    public function record_move_commits_rename(): void
    {
        app(WgwStorage::class)->files()->put('users/alice/old.txt', 'content');
        $this->service->recordUpsert('users/alice/old.txt', 'alice');
        app(WgwStorage::class)->files()->move('users/alice/old.txt', 'users/alice/new.txt');

        $this->service->recordMove('users/alice/old.txt', 'users/alice/new.txt', 'alice');

        $repoRoot = $this->dataDir.'/files/users/alice';
        $this->assertTrue($this->fileTracked($repoRoot, 'new.txt'));
        $this->assertFalse($this->fileTracked($repoRoot, 'old.txt'));
    }

    #[Test]
    public function record_storage_key_upsert_for_group_commits(): void
    {
        File::ensureDirectoryExists($this->dataDir.'/files/groups/team-a');
        app(WgwStorage::class)->files()->put('groups/team-a/shared.txt', 'group file');

        $this->service->recordUpsert('groups/team-a/shared.txt', 'alice');

        $repoRoot = $this->dataDir.'/files/groups/team-a';
        $this->assertSame(1, $this->gitLogCount($repoRoot));
        $this->assertStringContainsString('alice', $this->latestCommitAuthor($repoRoot));
    }
}
