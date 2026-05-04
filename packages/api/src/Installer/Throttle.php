<?php

declare(strict_types=1);

namespace App\Installer;

use App\Paths;

final class Throttle
{
    private const MAX_ATTEMPTS = 8;

    private const WINDOW_SECONDS = 600;

    public static function allow(string $key): bool
    {
        $dir = Paths::data().'/install_throttle';
        if (!is_dir($dir)) {
            @mkdir($dir, 0700, true);
        }
        $file = $dir.'/'.hash('sha256', $key);
        $now = time();
        $lines = is_readable($file) ? file($file, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) : [];
        $timestamps = [];
        foreach ($lines as $line) {
            $t = (int) $line;
            if ($t > $now - self::WINDOW_SECONDS) {
                $timestamps[] = $t;
            }
        }
        if (count($timestamps) >= self::MAX_ATTEMPTS) {
            return false;
        }
        $timestamps[] = $now;
        file_put_contents($file, implode("\n", $timestamps)."\n", LOCK_EX);

        return true;
    }
}
