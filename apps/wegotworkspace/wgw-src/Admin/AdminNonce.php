<?php

declare(strict_types=1);

namespace App\Admin;

use App\Paths;

final class AdminNonce
{
    private const TTL = 1800;

    public static function issue(string $adminUser): string
    {
        $payload = json_encode([
            'u' => $adminUser,
            'exp' => time() + self::TTL,
            'ua' => self::userAgentHash(),
        ], JSON_THROW_ON_ERROR);
        $payloadB64 = self::base64UrlEncode($payload);
        $sig = hash_hmac('sha256', $payloadB64, self::secret(), true);

        return $payloadB64.'.'.self::base64UrlEncode($sig);
    }

    public static function validate(?string $token, string $adminUser): bool
    {
        if (!is_string($token) || $token === '') {
            return false;
        }
        $parts = explode('.', $token, 2);
        if (count($parts) !== 2) {
            return false;
        }
        [$payloadB64, $sigB64] = $parts;
        $payloadJson = self::base64UrlDecode($payloadB64);
        $sig = self::base64UrlDecode($sigB64);
        if ($payloadJson === null || $sig === null) {
            return false;
        }
        $expected = hash_hmac('sha256', $payloadB64, self::secret(), true);
        if (!hash_equals($expected, $sig)) {
            return false;
        }

        try {
            $decoded = json_decode($payloadJson, true, 512, JSON_THROW_ON_ERROR);
        } catch (\Throwable) {
            return false;
        }
        if (!is_array($decoded)) {
            return false;
        }
        $u = is_string($decoded['u'] ?? null) ? $decoded['u'] : '';
        $exp = (int) ($decoded['exp'] ?? 0);
        $ua = is_string($decoded['ua'] ?? null) ? $decoded['ua'] : '';

        return $u === $adminUser && $exp >= time() && hash_equals($ua, self::userAgentHash());
    }

    private static function secret(): string
    {
        $path = Paths::data().'/admin_nonce.secret';
        if (!is_readable($path)) {
            @mkdir(dirname($path), 0775, true);
            file_put_contents($path, random_bytes(32), LOCK_EX);
            @chmod($path, 0600);
        }
        $secret = file_get_contents($path);
        if (!is_string($secret) || strlen($secret) < 32) {
            throw new \RuntimeException('Could not initialize admin nonce secret');
        }

        return $secret;
    }

    private static function userAgentHash(): string
    {
        $ua = (string) ($_SERVER['HTTP_USER_AGENT'] ?? '');

        return hash('sha256', $ua);
    }

    private static function base64UrlEncode(string $value): string
    {
        return rtrim(strtr(base64_encode($value), '+/', '-_'), '=');
    }

    private static function base64UrlDecode(string $value): ?string
    {
        $raw = strtr($value, '-_', '+/');
        $pad = strlen($raw) % 4;
        if ($pad > 0) {
            $raw .= str_repeat('=', 4 - $pad);
        }
        $decoded = base64_decode($raw, true);

        return $decoded === false ? null : $decoded;
    }
}
