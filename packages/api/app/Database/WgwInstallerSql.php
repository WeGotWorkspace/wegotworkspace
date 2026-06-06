<?php

declare(strict_types=1);

namespace App\Database;

use App\Support\AppPaths;
use Illuminate\Support\Facades\DB;

/**
 * Applies driver-specific installer SQL bundles during wgw Laravel migrations.
 * Sabre Cal/Card/Locks/PropertyStorage schemas stay in SQL until fully ported to Blueprint.
 */
final class WgwInstallerSql
{
    public function __construct(private AppPaths $paths) {}

    /**
     * @return list<string>
     */
    public function sabreBundleFiles(): array
    {
        return [
            'calendars.sql',
            'addressbooks.sql',
            'locks.sql',
            'propertystorage.sql',
        ];
    }

    public function applySabreBundlesIfMissing(): void
    {
        if (DB::connection('wgw')->getSchemaBuilder()->hasTable('calendarobjects')) {
            return;
        }

        $driver = DB::connection('wgw')->getDriverName();
        if (! in_array($driver, ['sqlite', 'mysql'], true)) {
            throw new \RuntimeException('Unsupported wgw driver for installer SQL: '.$driver);
        }

        foreach ($this->sabreBundleFiles() as $file) {
            $sql = trim($this->loadSql($driver, $file));
            if ($sql !== '') {
                DB::connection('wgw')->unprepared($sql);
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

        return $sql;
    }
}
