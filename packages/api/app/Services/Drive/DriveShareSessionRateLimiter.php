<?php

declare(strict_types=1);

namespace App\Services\Drive;

use Illuminate\Cache\RateLimiter;

final class DriveShareSessionRateLimiter
{
    private const IP_LIMIT = 30;

    private const TOKEN_LIMIT = 10;

    private const DECAY_SECONDS = 3600;

    public function __construct(private RateLimiter $rateLimiter) {}

    public function allow(string $ip, string $token): bool
    {
        $ipKey = 'drive-share-session-ip:'.$this->normalizeIp($ip);
        $tokenKey = 'drive-share-session-token:'.strtolower(trim($token));

        if ($this->rateLimiter->tooManyAttempts($ipKey, self::IP_LIMIT)) {
            return false;
        }
        if ($this->rateLimiter->tooManyAttempts($tokenKey, self::TOKEN_LIMIT)) {
            return false;
        }

        $this->rateLimiter->hit($ipKey, self::DECAY_SECONDS);
        $this->rateLimiter->hit($tokenKey, self::DECAY_SECONDS);

        return true;
    }

    private function normalizeIp(string $ip): string
    {
        $ip = trim($ip);

        return $ip !== '' ? $ip : 'unknown';
    }
}
