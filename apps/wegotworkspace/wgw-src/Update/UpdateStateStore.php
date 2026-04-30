<?php

declare(strict_types=1);

namespace App\Update;

use App\Paths;

final class UpdateStateStore
{
    /**
     * @return array<string, mixed>
     */
    public static function read(): array
    {
        $path = self::statePath();
        if (!is_readable($path)) {
            return [];
        }
        $raw = file_get_contents($path);
        if (!is_string($raw) || $raw === '') {
            return [];
        }
        $decoded = json_decode($raw, true);

        return is_array($decoded) ? $decoded : [];
    }

    /**
     * @param array<string, mixed> $state
     */
    public static function write(array $state): void
    {
        self::ensureDirs();
        file_put_contents(self::statePath(), json_encode($state, JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT)."\n", LOCK_EX);
    }

    /**
     * @return list<string>
     */
    public static function readLog(): array
    {
        $path = self::logPath();
        if (!is_readable($path)) {
            return [];
        }
        $raw = file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
        if (!is_array($raw)) {
            return [];
        }

        return array_values(array_slice($raw, -300));
    }

    public static function appendLog(string $message): void
    {
        self::ensureDirs();
        file_put_contents(self::logPath(), '['.date('c').'] '.$message."\n", FILE_APPEND | LOCK_EX);
    }

    public static function lockPath(): string
    {
        return self::baseDir().'/update.lock';
    }

    public static function cancelPath(): string
    {
        return self::baseDir().'/cancel.requested';
    }

    public static function requestCancel(): void
    {
        self::ensureDirs();
        file_put_contents(self::cancelPath(), date('c')."\n", LOCK_EX);
    }

    public static function clearCancelRequest(): void
    {
        @unlink(self::cancelPath());
    }

    public static function isCancelRequested(): bool
    {
        return is_file(self::cancelPath());
    }

    public static function maintenancePath(): string
    {
        return self::baseDir().'/.maintenance';
    }

    public static function packagePath(): string
    {
        return self::tmpDir().'/release.zip';
    }

    public static function stagingDir(): string
    {
        return self::tmpDir().'/staging';
    }

    public static function backupDir(): string
    {
        return self::baseDir().'/backup';
    }

    public static function baseDir(): string
    {
        return Paths::data().'/updates';
    }

    public static function cleanupTemporaryData(): void
    {
        self::rmRecursive(self::tmpDir());
        @unlink(self::packagePath());
        self::clearCancelRequest();
    }

    private static function tmpDir(): string
    {
        return self::baseDir().'/tmp';
    }

    private static function statePath(): string
    {
        return self::baseDir().'/state.json';
    }

    private static function logPath(): string
    {
        return self::baseDir().'/update.log';
    }

    private static function ensureDirs(): void
    {
        @mkdir(self::baseDir(), 0775, true);
        @mkdir(self::tmpDir(), 0775, true);
        @mkdir(self::backupDir(), 0775, true);
    }

    private static function rmRecursive(string $path): void
    {
        if (!is_dir($path)) {
            return;
        }
        $items = scandir($path);
        if (!is_array($items)) {
            return;
        }
        foreach ($items as $item) {
            if ($item === '.' || $item === '..') {
                continue;
            }
            $full = $path.'/'.$item;
            if (is_dir($full)) {
                self::rmRecursive($full);
                continue;
            }
            @unlink($full);
        }
        @rmdir($path);
    }
}
