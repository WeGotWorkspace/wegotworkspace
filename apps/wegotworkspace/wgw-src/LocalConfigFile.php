<?php

declare(strict_types=1);

namespace App;

final class LocalConfigFile
{
    /** @var array<string, array<string, mixed>> */
    private static array $cache = [];

    /**
     * Read `wgw-config.php`.
     *
     * Supports both styles:
     * - return array (installer generated)
     * - WordPress-style define(...) constants (sample)
     *
     * @return array<string, mixed>
     */
    public static function read(string $path): array
    {
        $cacheKey = self::cacheKey($path);
        if (isset(self::$cache[$cacheKey])) {
            return self::$cache[$cacheKey];
        }

        $raw = require $path;
        if (is_array($raw)) {
            self::$cache[$cacheKey] = $raw;

            return self::$cache[$cacheKey];
        }

        self::$cache[$cacheKey] = self::fromDefinedConstants();

        return self::$cache[$cacheKey];
    }

    /**
     * @return array<string, mixed>
     */
    private static function fromDefinedConstants(): array
    {
        $cfg = [];

        $dataDir = self::definedString('WGW_DATA_DIR');
        if ($dataDir !== null) {
            $cfg['data_dir'] = $dataDir;
        }
        $updateFeedUrl = self::definedString('WGW_UPDATE_FEED_URL');
        if ($updateFeedUrl !== null) {
            $cfg['update_feed_url'] = $updateFeedUrl;
        }

        $pdo = [];
        $sqliteFile = self::definedString('WGW_DB_SQLITE_FILE');
        if ($sqliteFile !== null) {
            $pdo['sqlite_file'] = $sqliteFile;
        } else {
            if ($dataDir !== null) {
                $pdo['sqlite_file'] = rtrim($dataDir, '/').'/db.sqlite';
            }
            $dsn = self::definedString('WGW_DB_DSN');
            if ($dsn !== null) {
                $pdo['dsn'] = $dsn;
                $pdo['user'] = self::definedNullableString('WGW_DB_USER');
                $pdo['password'] = self::definedNullableString('WGW_DB_PASSWORD');
            }
        }

        if ($pdo !== []) {
            $cfg['pdo'] = $pdo;
        }

        return $cfg;
    }

    private static function definedString(string $name): ?string
    {
        if (!defined($name)) {
            return null;
        }

        $value = constant($name);
        if (!is_string($value)) {
            return null;
        }

        $trimmed = trim($value);

        return $trimmed === '' ? null : $trimmed;
    }

    private static function definedNullableString(string $name): ?string
    {
        if (!defined($name)) {
            return null;
        }

        $value = constant($name);
        if ($value === null) {
            return null;
        }
        if (!is_string($value)) {
            return null;
        }

        return $value;
    }

    private static function cacheKey(string $path): string
    {
        $real = realpath($path);
        if ($real !== false) {
            return $real;
        }

        return $path;
    }
}
