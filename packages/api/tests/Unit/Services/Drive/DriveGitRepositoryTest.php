<?php

declare(strict_types=1);

namespace Tests\Unit\Services\Drive;

use App\Services\Drive\DriveGitRepository;
use PHPUnit\Framework\Attributes\Test;
use Tests\Support\InteractsWithTempGitRepo;
use Tests\TestCase;

final class DriveGitRepositoryTest extends TestCase
{
    use InteractsWithTempGitRepo;

    private string $repoRoot;

    private DriveGitRepository $repository;

    protected function setUp(): void
    {
        parent::setUp();

        if (! self::gitAvailable()) {
            $this->markTestSkipped('git binary is not available');
        }

        $this->repoRoot = sys_get_temp_dir().'/wgw-git-repo-'.uniqid('', true);
        mkdir($this->repoRoot, 0775, true);

        $this->repository = new DriveGitRepository;
    }

    protected function tearDown(): void
    {
        $this->removeTree($this->repoRoot);
        parent::tearDown();
    }

    #[Test]
    public function ensure_repo_creates_git_directory_and_gitignore(): void
    {
        $this->repository->ensureRepo($this->repoRoot);

        $this->assertDirectoryExists($this->repoRoot.'/.git');
        $this->assertFileExists($this->repoRoot.'/.gitignore');
        $contents = file_get_contents($this->repoRoot.'/.gitignore');
        $this->assertIsString($contents);
        $this->assertStringContainsString('.notes/', $contents);
        $this->assertStringContainsString('.*.yjs', $contents);
    }

    #[Test]
    public function commit_upsert_creates_commit_with_author_and_message(): void
    {
        $this->writeRepoFile('hello.txt', 'hello world');

        $committed = $this->repository->commitUpsert(
            $this->repoRoot,
            'hello.txt',
            'Alice <alice@wgw.local>',
            'Auto: alice updated hello.txt',
        );

        $this->assertTrue($committed);
        $this->assertSame(1, $this->gitLogCount($this->repoRoot));
        $this->assertSame('Alice <alice@wgw.local>', $this->latestCommitAuthor($this->repoRoot));
        $this->assertSame('Auto: alice updated hello.txt', $this->latestCommitMessage($this->repoRoot));
        $this->assertTrue($this->fileTracked($this->repoRoot, 'hello.txt'));
    }

    #[Test]
    public function second_upsert_creates_second_commit(): void
    {
        $this->writeRepoFile('hello.txt', 'v1');
        $this->repository->commitUpsert($this->repoRoot, 'hello.txt', 'Alice <alice@wgw.local>', 'Auto: alice updated hello.txt');

        $this->writeRepoFile('hello.txt', 'v2');
        $this->repository->commitUpsert($this->repoRoot, 'hello.txt', 'Alice <alice@wgw.local>', 'Auto: alice updated hello.txt');

        $this->assertSame(2, $this->gitLogCount($this->repoRoot));
    }

    #[Test]
    public function upsert_with_no_content_change_does_not_create_new_commit(): void
    {
        $this->writeRepoFile('hello.txt', 'same');
        $this->repository->commitUpsert($this->repoRoot, 'hello.txt', 'Alice <alice@wgw.local>', 'Auto: alice updated hello.txt');
        $this->repository->commitUpsert($this->repoRoot, 'hello.txt', 'Alice <alice@wgw.local>', 'Auto: alice updated hello.txt');

        $this->assertSame(1, $this->gitLogCount($this->repoRoot));
    }

    #[Test]
    public function commit_delete_removes_file_from_git(): void
    {
        $this->writeRepoFile('hello.txt', 'hello');
        $this->repository->commitUpsert($this->repoRoot, 'hello.txt', 'Alice <alice@wgw.local>', 'Auto: alice updated hello.txt');
        @unlink($this->repoRoot.'/hello.txt');

        $committed = $this->repository->commitDelete(
            $this->repoRoot,
            'hello.txt',
            'Alice <alice@wgw.local>',
            'Auto: alice deleted hello.txt',
        );

        $this->assertTrue($committed);
        $this->assertSame(2, $this->gitLogCount($this->repoRoot));
        $this->assertFalse($this->fileTracked($this->repoRoot, 'hello.txt'));
    }

    #[Test]
    public function commit_move_renames_tracked_file(): void
    {
        $this->writeRepoFile('old.txt', 'content');
        $this->repository->commitUpsert($this->repoRoot, 'old.txt', 'Alice <alice@wgw.local>', 'Auto: alice updated old.txt');
        rename($this->repoRoot.'/old.txt', $this->repoRoot.'/new.txt');

        $committed = $this->repository->commitMove(
            $this->repoRoot,
            'old.txt',
            'new.txt',
            'Alice <alice@wgw.local>',
            'Auto: alice moved old.txt to new.txt',
        );

        $this->assertTrue($committed);
        $this->assertFalse($this->fileTracked($this->repoRoot, 'old.txt'));
        $this->assertTrue($this->fileTracked($this->repoRoot, 'new.txt'));
    }

    #[Test]
    public function lock_contention_skips_second_commit_without_error(): void
    {
        $this->repository->ensureRepo($this->repoRoot);
        $lockPath = $this->repoRoot.'/.git/wegot.lock';
        $lock = fopen($lockPath, 'c');
        $this->assertNotFalse($lock);
        flock($lock, LOCK_EX);

        try {
            $this->writeRepoFile('hello.txt', 'hello');
            $committed = $this->repository->commitUpsert(
                $this->repoRoot,
                'hello.txt',
                'Alice <alice@wgw.local>',
                'Auto: alice updated hello.txt',
            );

            $this->assertFalse($committed);
            $this->assertSame(0, $this->gitLogCount($this->repoRoot));
        } finally {
            flock($lock, LOCK_UN);
            fclose($lock);
        }
    }

    private function writeRepoFile(string $relativePath, string $contents): void
    {
        $path = $this->repoRoot.'/'.$relativePath;
        $dir = dirname($path);
        if (! is_dir($dir)) {
            mkdir($dir, 0775, true);
        }
        file_put_contents($path, $contents);
    }

    private function removeTree(string $dir): void
    {
        if (! is_dir($dir)) {
            return;
        }

        $items = scandir($dir);
        if ($items === false) {
            return;
        }

        foreach ($items as $item) {
            if ($item === '.' || $item === '..') {
                continue;
            }
            $path = $dir.'/'.$item;
            if (is_dir($path)) {
                $this->removeTree($path);
            } else {
                @unlink($path);
            }
        }

        @rmdir($dir);
    }
}
