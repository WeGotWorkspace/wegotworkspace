<?php

declare(strict_types=1);

namespace App\Auth;

use App\Paths;

final class LoginThrottle
{
    private const WINDOW_SECONDS = 600;

    private const MAX_PER_USER_IP = 8;

    private const MAX_PER_IP = 40;

    public static function allowAndRecord(string $ip, string $username): bool
    {
        if (self::isDisabled()) {
            return true;
        }

        $ipNorm = self::normalizeIp($ip);
        $userNorm = self::normalizeUser($username);

        $ipAllowed = self::allowForKey('ip:'.$ipNorm, self::MAX_PER_IP);
        $userIpAllowed = self::allowForKey('user:'.$userNorm.'|ip:'.$ipNorm, self::MAX_PER_USER_IP);

        return $ipAllowed && $userIpAllowed;
    }

    public static function clearUserIp(string $ip, string $username): void
    {
        if (self::isDisabled()) {
            return;
        }

        $ipNorm = self::normalizeIp($ip);
        $userNorm = self::normalizeUser($username);
        $file = self::bucketFile('user:'.$userNorm.'|ip:'.$ipNorm);
        @unlink($file);
    }

    private static function isDisabled(): bool
    {
        $raw = strtolower(trim((string) getenv('WGW_DISABLE_LOGIN_THROTTLE')));

        return $raw === '1' || $raw === 'true' || $raw === 'yes' || $raw === 'on';
    }

    private static function allowForKey(string $key, int $maxAttempts): bool
    {
        $file = self::bucketFile($key);
        $now = time();
        $lines = is_readable($file) ? file($file, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) : [];
        $timestamps = [];
        foreach ($lines ?: [] as $line) {
            $t = (int) $line;
            if ($t > $now - self::WINDOW_SECONDS) {
                $timestamps[] = $t;
            }
        }

        if (count($timestamps) >= $maxAttempts) {
            return false;
        }

        $timestamps[] = $now;
        file_put_contents($file, implode("\n", $timestamps)."\n", LOCK_EX);

        return true;
    }

    private static function bucketFile(string $key): string
    {
        $dir = Paths::data().'/login_throttle';
        if (!is_dir($dir)) {
            @mkdir($dir, 0700, true);
        }

        return $dir.'/'.hash('sha256', $key);
    }

    private static function normalizeIp(string $ip): string
    {
        $ip = trim($ip);

        return $ip !== '' ? $ip : 'unknown';
    }

    private static function normalizeUser(string $username): string
    {
        $user = strtolower(trim($username));

        return $user !== '' ? $user : 'unknown';
    }
}
