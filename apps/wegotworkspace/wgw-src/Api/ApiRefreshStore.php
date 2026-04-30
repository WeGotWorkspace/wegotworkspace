<?php

declare(strict_types=1);

namespace App\Api;

use App\Paths;

final class ApiRefreshStore
{
    private const TTL_SECONDS = 1209600; // 14 days

    private static function path(): string
    {
        return Paths::data().'/api/refresh-tokens.json';
    }

    /**
     * @return array<string, array{username: string, role: string, exp: int, revoked: bool}>
     */
    private static function load(string $path): array
    {
        if (!is_readable($path)) {
            return [];
        }
        $raw = file_get_contents($path);
        if (!is_string($raw) || trim($raw) === '') {
            return [];
        }
        $decoded = json_decode($raw, true);
        if (!is_array($decoded)) {
            return [];
        }
        $out = [];
        foreach ($decoded as $hash => $row) {
            if (!is_string($hash) || !is_array($row)) {
                continue;
            }
            $username = isset($row['username']) && is_string($row['username']) ? $row['username'] : '';
            $role = isset($row['role']) && is_string($row['role']) ? $row['role'] : '';
            $exp = isset($row['exp']) && is_numeric($row['exp']) ? (int) $row['exp'] : 0;
            $revoked = (bool) ($row['revoked'] ?? false);
            if ($username === '' || $role === '' || $exp <= 0) {
                continue;
            }
            $out[$hash] = [
                'username' => $username,
                'role' => $role,
                'exp' => $exp,
                'revoked' => $revoked,
            ];
        }

        return $out;
    }

    /**
     * @param array<string, array{username: string, role: string, exp: int, revoked: bool}> $items
     */
    private static function save(string $path, array $items): void
    {
        $dir = dirname($path);
        if (!is_dir($dir)) {
            @mkdir($dir, 0700, true);
        }
        file_put_contents($path, (string) json_encode($items, JSON_UNESCAPED_SLASHES), LOCK_EX);
    }

    private static function tokenHash(string $token): string
    {
        return hash('sha256', $token);
    }

    /**
     * @param 'guest'|'user'|'admin' $role
     */
    public static function issue(string $username, string $role): string
    {
        $token = bin2hex(random_bytes(32));
        $path = self::path();
        $items = self::load($path);
        $now = time();
        foreach ($items as $hash => $row) {
            if ($row['exp'] <= $now) {
                unset($items[$hash]);
            }
        }
        $items[self::tokenHash($token)] = [
            'username' => $username,
            'role' => $role,
            'exp' => $now + self::TTL_SECONDS,
            'revoked' => false,
        ];
        self::save($path, $items);

        return $token;
    }

    /**
     * @return array{username: string, role: 'guest'|'user'|'admin'}|null
     */
    public static function consume(string $token): ?array
    {
        $path = self::path();
        $items = self::load($path);
        $hash = self::tokenHash($token);
        $row = $items[$hash] ?? null;
        if (!is_array($row)) {
            return null;
        }
        if ($row['revoked'] || $row['exp'] <= time()) {
            unset($items[$hash]);
            self::save($path, $items);

            return null;
        }
        $items[$hash]['revoked'] = true;
        self::save($path, $items);

        return [
            'username' => $row['username'],
            'role' => $row['role'],
        ];
    }

    public static function revoke(string $token): void
    {
        $path = self::path();
        $items = self::load($path);
        $hash = self::tokenHash($token);
        if (!isset($items[$hash])) {
            return;
        }
        $items[$hash]['revoked'] = true;
        self::save($path, $items);
    }
}
