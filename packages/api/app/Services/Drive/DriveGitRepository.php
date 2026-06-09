<?php

declare(strict_types=1);

namespace App\Services\Drive;

use Illuminate\Support\Facades\Log;
use Symfony\Component\Process\Process;

final class DriveGitRepository
{
    private const DEFAULT_GITIGNORE = <<<'GITIGNORE'
.notes/
.*.yjs
.git/wegot.lock
GITIGNORE;

    public function ensureRepo(string $repoRoot): void
    {
        if (is_dir($repoRoot.'/.git')) {
            return;
        }

        $this->runGit(['init'], $repoRoot);
        $this->writeGitignore($repoRoot);
    }

    public function commitUpsert(string $repoRoot, string $relativePath, string $author, string $message): bool
    {
        return $this->withLock($repoRoot, function () use ($repoRoot, $relativePath, $author, $message): bool {
            $this->ensureRepo($repoRoot);

            if (! $this->runGit(['add', '--', $relativePath], $repoRoot)) {
                return false;
            }

            if ($this->gitDiffCachedQuiet($repoRoot)) {
                return false;
            }

            return $this->runGit([
                '-c', 'user.name=WeGotWorkspace',
                '-c', 'user.email=versioning@wgw.local',
                'commit',
                '--author='.$author,
                '-m', $message,
            ], $repoRoot);
        });
    }

    public function commitDelete(string $repoRoot, string $relativePath, string $author, string $message): bool
    {
        return $this->withLock($repoRoot, function () use ($repoRoot, $relativePath, $author, $message): bool {
            $this->ensureRepo($repoRoot);

            if (! $this->runGit(['rm', '--ignore-unmatch', '--', $relativePath], $repoRoot)) {
                return false;
            }

            if ($this->gitDiffCachedQuiet($repoRoot)) {
                return false;
            }

            return $this->runGit([
                '-c', 'user.name=WeGotWorkspace',
                '-c', 'user.email=versioning@wgw.local',
                'commit',
                '--author='.$author,
                '-m', $message,
            ], $repoRoot);
        });
    }

    public function commitMove(
        string $repoRoot,
        string $fromRelativePath,
        string $toRelativePath,
        string $author,
        string $message,
    ): bool {
        return $this->withLock($repoRoot, function () use ($repoRoot, $fromRelativePath, $toRelativePath, $author, $message): bool {
            $this->ensureRepo($repoRoot);

            $fromExists = is_file($repoRoot.'/'.$fromRelativePath);
            $toExists = is_file($repoRoot.'/'.$toRelativePath);
            $fromTracked = $this->fileTracked($repoRoot, $fromRelativePath);

            if ($fromTracked && $fromExists && ! $toExists) {
                if (! $this->runGit(['mv', '--', $fromRelativePath, $toRelativePath], $repoRoot)) {
                    return false;
                }
            } elseif ($fromTracked && ! $fromExists && $toExists) {
                if (! $this->runGit(['rm', '--cached', '--ignore-unmatch', '--', $fromRelativePath], $repoRoot)) {
                    return false;
                }
                if (! $this->runGit(['add', '--', $toRelativePath], $repoRoot)) {
                    return false;
                }
            } elseif ($toExists) {
                if (! $this->runGit(['add', '--', $toRelativePath], $repoRoot)) {
                    return false;
                }
                if ($fromTracked) {
                    if (! $this->runGit(['rm', '--cached', '--ignore-unmatch', '--', $fromRelativePath], $repoRoot)) {
                        return false;
                    }
                }
            } else {
                return false;
            }

            if ($this->gitDiffCachedQuiet($repoRoot)) {
                return false;
            }

            return $this->runGit([
                '-c', 'user.name=WeGotWorkspace',
                '-c', 'user.email=versioning@wgw.local',
                'commit',
                '--author='.$author,
                '-m', $message,
            ], $repoRoot);
        });
    }

    /**
     * @param  callable(): bool  $callback
     */
    private function withLock(string $repoRoot, callable $callback): bool
    {
        $this->ensureRepo($repoRoot);

        $lockPath = $repoRoot.'/.git/wegot.lock';
        $lock = fopen($lockPath, 'c');
        if ($lock === false) {
            Log::warning('Drive git versioning: unable to open lock file', ['repo' => $repoRoot]);

            return false;
        }

        try {
            if (! flock($lock, LOCK_EX | LOCK_NB)) {
                return false;
            }

            return $callback();
        } catch (\Throwable $e) {
            Log::warning('Drive git versioning failed', [
                'repo' => $repoRoot,
                'message' => $e->getMessage(),
            ]);

            return false;
        } finally {
            flock($lock, LOCK_UN);
            fclose($lock);
        }
    }

    private function writeGitignore(string $repoRoot): void
    {
        $path = $repoRoot.'/.gitignore';
        if (file_exists($path)) {
            return;
        }

        file_put_contents($path, self::DEFAULT_GITIGNORE);
    }

    private function gitDiffCachedQuiet(string $repoRoot): bool
    {
        $process = new Process(['git', '-C', $repoRoot, 'diff', '--cached', '--quiet']);
        $process->run();

        return $process->isSuccessful();
    }

    private function fileTracked(string $repoRoot, string $relativePath): bool
    {
        $process = new Process(['git', '-C', $repoRoot, 'ls-files', '--error-unmatch', $relativePath]);
        $process->run();

        return $process->isSuccessful();
    }

    /**
     * @param  list<string>  $command
     */
    private function runGit(array $command, string $repoRoot): bool
    {
        $process = new Process(array_merge(['git', '-C', $repoRoot], $command));
        $process->run();

        if (! $process->isSuccessful()) {
            Log::warning('Drive git command failed', [
                'repo' => $repoRoot,
                'command' => $process->getCommandLine(),
                'stderr' => trim($process->getErrorOutput()),
            ]);

            return false;
        }

        return true;
    }
}
