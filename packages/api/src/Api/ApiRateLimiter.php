<?php

declare(strict_types=1);

namespace App\Api;

use App\Paths;
use Symfony\Component\Cache\Adapter\FilesystemAdapter;
use Symfony\Component\RateLimiter\RateLimiterFactory;
use Symfony\Component\RateLimiter\Storage\CacheStorage;

final class ApiRateLimiter
{
    public static function allowLoginAttempt(string $username, string $ip): bool
    {
        if (self::isDisabled()) {
            return true;
        }

        $user = self::normalizeUser($username);
        $ipNorm = self::normalizeIp($ip);

        $ipLimiter = self::factory(40, '10 minutes')->create('api-login-ip-'.$ipNorm);
        $userIpLimiter = self::factory(8, '10 minutes')->create('api-login-user-'.$user.'-ip-'.$ipNorm);

        $ipResult = $ipLimiter->consume(1);
        $userIpResult = $userIpLimiter->consume(1);

        return $ipResult->isAccepted() && $userIpResult->isAccepted();
    }

    public static function resetUserIp(string $username, string $ip): void
    {
        if (self::isDisabled()) {
            return;
        }

        $user = self::normalizeUser($username);
        $ipNorm = self::normalizeIp($ip);
        $limiter = self::factory(8, '10 minutes')->create('api-login-user-'.$user.'-ip-'.$ipNorm);
        $limiter->reset();
    }

    private static function isDisabled(): bool
    {
        $raw = strtolower(trim((string) getenv('WGW_DISABLE_LOGIN_THROTTLE')));

        return $raw === '1' || $raw === 'true' || $raw === 'yes' || $raw === 'on';
    }

    private static function factory(int $limit, string $interval): RateLimiterFactory
    {
        $cache = new FilesystemAdapter(
            'api_rate_limiter',
            0,
            Paths::data().'/api/rate-limiter-cache'
        );

        return new RateLimiterFactory(
            [
                'id' => 'api_login',
                'policy' => 'sliding_window',
                'limit' => $limit,
                'interval' => $interval,
            ],
            new CacheStorage($cache)
        );
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
