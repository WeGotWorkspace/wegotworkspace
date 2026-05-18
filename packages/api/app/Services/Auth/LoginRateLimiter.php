<?php

declare(strict_types=1);

namespace App\Services\Auth;

use App\Support\WgwInstallConfig;
use Symfony\Component\Cache\Adapter\FilesystemAdapter;
use Symfony\Component\RateLimiter\RateLimiterFactory;
use Symfony\Component\RateLimiter\Storage\CacheStorage;

final class LoginRateLimiter
{
    public function __construct(private WgwInstallConfig $install)
    {
    }

    public function allow(string $username, string $ip): bool
    {
        if ($this->isDisabled()) {
            return true;
        }

        $user = $this->normalizeUser($username);
        $ipNorm = $this->normalizeIp($ip);

        $ipLimiter = $this->factory(40, '10 minutes')->create('api-login-ip-'.$ipNorm);
        $userIpLimiter = $this->factory(8, '10 minutes')->create('api-login-user-'.$user.'-ip-'.$ipNorm);

        return $ipLimiter->consume(1)->isAccepted() && $userIpLimiter->consume(1)->isAccepted();
    }

    public function reset(string $username, string $ip): void
    {
        if ($this->isDisabled()) {
            return;
        }

        $user = $this->normalizeUser($username);
        $ipNorm = $this->normalizeIp($ip);
        $this->factory(8, '10 minutes')->create('api-login-user-'.$user.'-ip-'.$ipNorm)->reset();
    }

    private function isDisabled(): bool
    {
        $raw = strtolower(trim((string) env('WGW_DISABLE_LOGIN_THROTTLE', '')));

        return in_array($raw, ['1', 'true', 'yes', 'on'], true);
    }

    private function factory(int $limit, string $interval): RateLimiterFactory
    {
        $cache = new FilesystemAdapter(
            'api_rate_limiter',
            0,
            $this->install->dataDir().'/api/rate-limiter-cache'
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

    private function normalizeIp(string $ip): string
    {
        $ip = trim($ip);

        return $ip !== '' ? $ip : 'unknown';
    }

    private function normalizeUser(string $username): string
    {
        $user = strtolower(trim($username));

        return $user !== '' ? $user : 'unknown';
    }
}
