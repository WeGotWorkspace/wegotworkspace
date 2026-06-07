<?php

declare(strict_types=1);

namespace App\Services\Installer;

use App\Support\AppPaths;
use App\Support\WgwConnectionConfigurator;
use Illuminate\Support\Facades\DB;

final class InstallerDatabaseInstaller
{
    public function __construct(
        private AppPaths $paths,
        private InstallerSeeder $seeder,
        private InstallerAppSettingsWriter $settings,
        private WgwSchemaMigrator $schemaMigrator,
    ) {}

    /**
     * @param  array<string, mixed>  $db
     */
    public function connect(array $db): \PDO
    {
        if (($db['driver'] ?? '') === 'sqlite') {
            $path = $this->paths->resolveProjectPath((string) ($db['sqlite_path'] ?? $this->paths->defaultSqliteRelativePath()));
            $dir = dirname($path);
            if (! is_dir($dir)) {
                @mkdir($dir, 0775, true);
            }

            return new \PDO('sqlite:'.$path, null, null, [
                \PDO::ATTR_ERRMODE => \PDO::ERRMODE_EXCEPTION,
            ]);
        }

        $host = (string) ($db['mysql_host'] ?? '127.0.0.1');
        $port = (int) ($db['mysql_port'] ?? 3306);
        $name = (string) ($db['mysql_db'] ?? '');
        $user = (string) ($db['mysql_user'] ?? '');
        $pass = (string) ($db['mysql_password'] ?? '');
        $dsn = sprintf('mysql:host=%s;port=%d;dbname=%s;charset=utf8mb4', $host, $port, $name);

        return new \PDO($dsn, $user, $pass, [
            \PDO::ATTR_ERRMODE => \PDO::ERRMODE_EXCEPTION,
        ]);
    }

    /**
     * @param  array<string, mixed>  $db
     * @param  array<string, mixed>  $initialSettings
     */
    public function installFresh(
        array $db,
        string $username,
        string $password,
        string $displayName,
        ?string $email,
        bool $enableCalendars,
        bool $enableContacts,
        array $initialSettings,
    ): void {
        if (($db['driver'] ?? '') === 'sqlite') {
            $path = $this->paths->resolveProjectPath((string) ($db['sqlite_path'] ?? $this->paths->defaultSqliteRelativePath()));
            $dir = dirname($path);
            if (! is_dir($dir)) {
                @mkdir($dir, 0775, true);
            }
        }

        WgwConnectionConfigurator::applyFromInstallerDb($db);

        DB::connection('wgw')->transaction(function () use (
            $username,
            $password,
            $displayName,
            $email,
            $enableCalendars,
            $enableContacts,
            $initialSettings,
        ): void {
            $this->schemaMigrator->migrate();
            $this->seeder->seed($username, $password, $displayName, $email, $enableCalendars, $enableContacts);
            $this->settings->replaceMany($initialSettings);
        });
    }

    /**
     * @param  array<string, mixed>  $db
     */
    public function testConnection(array $db): void
    {
        $this->connect($db)->query('SELECT 1');
    }
}
