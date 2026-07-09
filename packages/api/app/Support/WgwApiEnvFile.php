<?php

declare(strict_types=1);

namespace App\Support;

/**
 * Read/write helpers for packages/api/.env without booting Laravel Dotenv.
 */
final class WgwApiEnvFile
{
    public static function readPath(string $envPath, string $key): ?string
    {
        if (! is_readable($envPath)) {
            return null;
        }

        return self::readValue((string) file_get_contents($envPath), $key);
    }

    public static function readValue(string $content, string $key): ?string
    {
        if (preg_match('/^'.preg_quote($key, '/').'\s*=\s*(\S+)/m', $content, $match) !== 1) {
            return null;
        }

        return trim($match[1], " \t\"'");
    }

    public static function hasKey(string $content, string $key): bool
    {
        return preg_match('/^'.preg_quote($key, '/').'=.*/m', $content) === 1;
    }

    public static function setLine(string $content, string $key, string $value, bool $quote = true): string
    {
        $line = $quote
            ? $key.'='.self::quoteValue($value)
            : $key.'='.$value;
        if (self::hasKey($content, $key)) {
            return (string) preg_replace('/^'.preg_quote($key, '/').'=.*/m', $line, $content);
        }

        return rtrim($content)."\n".$line."\n";
    }

    public static function quoteValue(string $value): string
    {
        if ($value === '' || preg_match('/[\s#="\']/', $value) === 1) {
            return '"'.str_replace(['\\', '"'], ['\\\\', '\\"'], $value).'"';
        }

        return $value;
    }

    /**
     * True when {@code $envPath} has WGW_DB_* values that differ from sibling .env.example.
     */
    public static function hasRealDatabaseConfig(string $envPath): bool
    {
        if (! is_readable($envPath)) {
            return false;
        }

        $content = (string) file_get_contents($envPath);
        $connection = self::readValue($content, 'WGW_DB_CONNECTION');
        if ($connection === null || $connection === '') {
            return false;
        }

        $database = self::readValue($content, 'WGW_DB_DATABASE');
        if ($database === null || $database === '') {
            return false;
        }

        $examplePath = dirname($envPath).'/.env.example';
        if (! is_readable($examplePath)) {
            return true;
        }

        $example = (string) file_get_contents($examplePath);
        $exampleConnection = self::readValue($example, 'WGW_DB_CONNECTION');
        $exampleDatabase = self::readValue($example, 'WGW_DB_DATABASE');

        return ! ($connection === $exampleConnection && $database === $exampleDatabase);
    }
}
