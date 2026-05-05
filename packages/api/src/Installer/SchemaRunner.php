<?php

declare(strict_types=1);

namespace App\Installer;

use App\Paths;

final class SchemaRunner
{
    /**
     * @param 'sqlite'|'mysql' $driver
     *
     * @return list<string> ordered relative filenames under src/sql/{driver}
     */
    public static function files(string $driver): array
    {
        $prefix = $driver === 'sqlite' ? 'sqlite.' : 'mysql.';

        return [
            $prefix.'users.sql',
            $prefix.'principals.sql',
            $prefix.'calendars.sql',
            $prefix.'addressbooks.sql',
            $prefix.'locks.sql',
            $prefix.'propertystorage.sql',
            $prefix.'settings.sql',
        ];
    }

    public static function loadSql(string $driver, string $file): string
    {
        $path = Paths::resources().'/sql/'.$driver.'/'.$file;
        if (!is_readable($path)) {
            throw new \RuntimeException('Schema file missing: '.$file);
        }
        $sql = file_get_contents($path);
        if ($sql === false) {
            throw new \RuntimeException('Cannot read schema: '.$file);
        }
        if (str_contains($file, 'principals')) {
            // Drop legacy seed INSERT blocks entirely (multi-line VALUES), keeping only schema DDL.
            $sql = preg_replace('/^\s*INSERT\s+INTO\s+principals\b[\s\S]*?;\s*/mi', '', $sql) ?? $sql;
        }

        return $sql;
    }

    public static function apply(\PDO $pdo, string $driver): void
    {
        foreach (self::files($driver) as $file) {
            $sql = trim(self::loadSql($driver, $file));
            if ($sql === '') {
                continue;
            }
            $pdo->exec($sql);
        }
    }
}
