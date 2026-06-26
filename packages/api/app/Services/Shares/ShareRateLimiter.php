<?php

declare(strict_types=1);

namespace App\Services\Shares;

use App\Services\Auth\LoginRateLimiter;
use Illuminate\Cache\RateLimiter;

/**
 * Throttles unauthenticated share grant-request and invite-confirm attempts.
 * Mirrors {@see LoginRateLimiter}: per-IP and per-target
 * sliding windows, with the same WGW_DISABLE_LOGIN_THROTTLE escape hatch used
 * by the auth tests.
 */
final class ShareRateLimiter
{
    private const int IP_LIMIT = 40;

    private const int TARGET_IP_LIMIT = 8;

    /** @var int Sliding window equivalent: 10 minutes */
    private const int DECAY_SECONDS = 600;

    public function __construct(private RateLimiter $rateLimiter) {}

    /**
     * @param  string  $action  Logical bucket, e.g. "grant" or "confirm".
     * @param  string  $target  Email or token the attempt is scoped to.
     */
    public function allow(string $action, string $target, string $ip): bool
    {
        if ($this->isDisabled()) {
            return true;
        }

        $ipNorm = $this->normalize($ip);
        $targetNorm = $this->normalize($target);
        $ipKey = 'api-share-'.$action.'-ip:'.$ipNorm;
        $targetKey = 'api-share-'.$action.'-target:'.$targetNorm.':ip:'.$ipNorm;

        if ($this->rateLimiter->tooManyAttempts($ipKey, self::IP_LIMIT)) {
            return false;
        }
        if ($this->rateLimiter->tooManyAttempts($targetKey, self::TARGET_IP_LIMIT)) {
            return false;
        }

        $this->rateLimiter->hit($ipKey, self::DECAY_SECONDS);
        $this->rateLimiter->hit($targetKey, self::DECAY_SECONDS);

        return true;
    }

    private function isDisabled(): bool
    {
        $raw = strtolower(trim((string) env('WGW_DISABLE_LOGIN_THROTTLE', '')));

        return in_array($raw, ['1', 'true', 'yes', 'on'], true);
    }

    private function normalize(string $value): string
    {
        $value = strtolower(trim($value));

        return $value !== '' ? $value : 'unknown';
    }
}
