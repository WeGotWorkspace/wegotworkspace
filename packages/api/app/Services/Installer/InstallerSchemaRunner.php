<?php

declare(strict_types=1);

namespace App\Services\Installer;

use App\Support\AppPaths;

final class InstallerSchemaRunner
{
    public function __construct(private AppPaths $paths)
    {
    }

    /**
     * @return list<string>
     */
    public function files(string $driver): array
    {
        return match ($driver) {
            'sqlite' => [
                'users.sql',
                'principals.sql',
                'calendars.sql',
                'addressbooks.sql',
                'locks.sql',
                'propertystorage.sql',
                'settings.sql',
            ],
            'mysql' => [
                'users.sql',
                'principals.sql',
                'calendars.sql',
                'addressbooks.sql',
                'locks.sql',
                'propertystorage.sql',
                'settings.sql',
            ],
            default => throw new \InvalidArgumentException('Unsupported driver: '.$driver),
        };
    }

    public function apply(\PDO $pdo, string $driver): void
    {
        foreach ($this->files($driver) as $file) {
            $sql = trim($this->loadSql($driver, $file));
            if ($sql !== '') {
                $pdo->exec($sql);
            }
        }
    }

    private function loadSql(string $driver, string $file): string
    {
        $path = $this->paths->installerSqlDir($driver).'/'.$file;
        if (! is_readable($path)) {
            throw new \RuntimeException('Schema file missing: '.$file);
        }
        $sql = file_get_contents($path);
        if ($sql === false) {
            throw new \RuntimeException('Cannot read schema: '.$file);
        }
        if (str_contains($file, 'principals')) {
            $sql = preg_replace('/^\s*INSERT\s+INTO\s+principals\b[\s\S]*?;\s*/mi', '', $sql) ?? $sql;
        }

        return $sql;
    }
}
