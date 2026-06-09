<?php

declare(strict_types=1);

namespace Tests\Support;

use Symfony\Component\Process\Process;

trait InteractsWithTempGitRepo
{
    protected static function gitAvailable(): bool
    {
        $process = Process::fromShellCommandline('git --version');
        $process->run();

        return $process->isSuccessful();
    }

    protected function gitLogCount(string $repoRoot): int
    {
        if (! is_dir($repoRoot.'/.git')) {
            return 0;
        }

        $process = new Process(['git', '-C', $repoRoot, 'rev-list', '--count', 'HEAD']);
        $process->run();
        if (! $process->isSuccessful()) {
            return 0;
        }

        return (int) trim($process->getOutput());
    }

    protected function latestCommitAuthor(string $repoRoot): string
    {
        $process = new Process(['git', '-C', $repoRoot, 'log', '-1', '--format=%an <%ae>']);
        $process->run();

        return trim($process->getOutput());
    }

    protected function latestCommitMessage(string $repoRoot): string
    {
        $process = new Process(['git', '-C', $repoRoot, 'log', '-1', '--format=%s']);
        $process->run();

        return trim($process->getOutput());
    }

    protected function fileTracked(string $repoRoot, string $relativePath): bool
    {
        $process = new Process(['git', '-C', $repoRoot, 'ls-files', '--error-unmatch', $relativePath]);
        $process->run();

        return $process->isSuccessful();
    }

    protected function fileExistsInWorkingTree(string $repoRoot, string $relativePath): bool
    {
        return is_file($repoRoot.'/'.$relativePath);
    }
}
