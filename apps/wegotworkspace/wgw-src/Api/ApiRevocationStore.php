<?php

declare(strict_types=1);

namespace App\Api;

use App\Paths;

final class ApiRevocationStore
{
    /**
     * @return array<string, int>
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
        foreach ($decoded as $jti => $exp) {
            if (!is_string($jti) || !is_numeric($exp)) {
                continue;
            }
            $out[$jti] = (int) $exp;
        }

        return $out;
    }

    /**
     * @param array<string, int> $items
     */
    private static function save(string $path, array $items): void
    {
        $dir = dirname($path);
        if (!is_dir($dir)) {
            @mkdir($dir, 0700, true);
        }
        file_put_contents($path, (string) json_encode($items, JSON_UNESCAPED_SLASHES), LOCK_EX);
    }

    private static function path(): string
    {
        return Paths::data().'/api/revoked-jtis.json';
    }

    public static function revoke(string $jti, int $exp): void
    {
        $path = self::path();
        $items = self::load($path);
        $now = time();
        foreach ($items as $k => $e) {
            if ($e <= $now) {
                unset($items[$k]);
            }
        }
        $items[$jti] = $exp;
        self::save($path, $items);
    }

    public static function isRevoked(string $jti): bool
    {
        $path = self::path();
        $items = self::load($path);
        $now = time();
        $changed = false;
        foreach ($items as $k => $e) {
            if ($e <= $now) {
                unset($items[$k]);
                $changed = true;
            }
        }
        if ($changed) {
            self::save($path, $items);
        }

        return isset($items[$jti]);
    }
}
