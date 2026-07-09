<?php

declare(strict_types=1);

namespace App\Services\Installer;

/**
 * One-shot parser for legacy {@code wgw-config.php} (installer array or define() sample).
 */
final class WgwLegacyConfigParser
{
    /**
     * @return array<string, mixed>
     */
    public static function read(string $path): array
    {
        $raw = require $path;
        if (is_array($raw)) {
            return $raw;
        }

        return self::fromDefinedConstants();
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
        $installChannel = self::definedString('WGW_INSTALL_CHANNEL');
        if ($installChannel !== null) {
            $cfg['install_channel'] = $installChannel;
        }

        $pdo = [];
        $sqliteFile = self::definedString('WGW_DB_SQLITE_FILE');
        if ($sqliteFile !== null) {
            $pdo['sqlite_file'] = $sqliteFile;
        } else {
            $dsn = self::definedString('WGW_DB_DSN');
            if ($dsn !== null) {
                $pdo['dsn'] = $dsn;
                $pdo['user'] = self::definedNullableString('WGW_DB_USER');
                $pdo['password'] = self::definedNullableString('WGW_DB_PASSWORD');
            } elseif ($dataDir !== null) {
                $pdo['sqlite_file'] = rtrim($dataDir, '/').'/db.sqlite';
            }
        }

        if ($pdo !== []) {
            $cfg['pdo'] = $pdo;
        }

        return $cfg;
    }

    private static function definedString(string $name): ?string
    {
        if (! defined($name)) {
            return null;
        }

        $value = constant($name);
        if (! is_string($value)) {
            return null;
        }

        $trimmed = trim($value);

        return $trimmed === '' ? null : $trimmed;
    }

    private static function definedNullableString(string $name): ?string
    {
        if (! defined($name)) {
            return null;
        }

        $value = constant($name);
        if ($value === null) {
            return null;
        }
        if (! is_string($value)) {
            return null;
        }

        return $value;
    }
}
