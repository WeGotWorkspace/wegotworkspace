<?php

declare(strict_types=1);

namespace App\Installer;

use App\Paths;
use App\Settings\SettingsKeys;
use App\Settings\SettingsRepository;
use App\Update\SchemaMigrationRunner;

final class DatabaseInstaller
{
    /**
     * @param array{
     *   driver: 'sqlite'|'mysql',
     *   sqlite_path?: string,
     *   mysql_host?: string,
     *   mysql_port?: int,
     *   mysql_db?: string,
     *   mysql_user?: string,
     *   mysql_password?: string
     * } $db
     */
    public static function connect(array $db): \PDO
    {
        if ($db['driver'] === 'sqlite') {
            $path = Paths::resolveProjectPath((string) ($db['sqlite_path'] ?? Paths::defaultSqliteFileSetting()));
            $dir = dirname($path);
            if (!is_dir($dir)) {
                @mkdir($dir, 0775, true);
            }
            $pdo = new \PDO('sqlite:'.$path, null, null, [
                \PDO::ATTR_ERRMODE => \PDO::ERRMODE_EXCEPTION,
            ]);

            return $pdo;
        }

        $host = $db['mysql_host'] ?? '127.0.0.1';
        $port = (int) ($db['mysql_port'] ?? 3306);
        $name = $db['mysql_db'] ?? '';
        $user = $db['mysql_user'] ?? '';
        $pass = $db['mysql_password'] ?? '';
        $dsn = sprintf('mysql:host=%s;port=%d;dbname=%s;charset=utf8mb4', $host, $port, $name);
        $pdo = new \PDO($dsn, $user, $pass, [
            \PDO::ATTR_ERRMODE => \PDO::ERRMODE_EXCEPTION,
        ]);

        return $pdo;
    }

    /**
     * @param array<string, mixed>   $db
     * @param array<string, mixed> $initialSettings keys from SettingsKeys, excluding pdo
     */
    public static function installFresh(
        array $db,
        string $username,
        string $password,
        string $displayName,
        ?string $email,
        bool $enableCalendars,
        bool $enableContacts,
        array $initialSettings,
    ): void {
        $driver = $db['driver'];
        $pdo = self::connect($db);

        if ($driver === 'sqlite') {
            $pdo->beginTransaction();
            try {
                SchemaRunner::apply($pdo, 'sqlite');
                Seeder::seed($pdo, $username, $password, $displayName, $email, $enableCalendars, $enableContacts);
                self::seedAppSettings($pdo, $initialSettings);
                SchemaMigrationRunner::migrate($pdo);
                if ($pdo->inTransaction()) {
                    $pdo->commit();
                }
            } catch (\Throwable $e) {
                if ($pdo->inTransaction()) {
                    $pdo->rollBack();
                }
                throw $e;
            }

            return;
        }

        $pdo->beginTransaction();
        try {
            SchemaRunner::apply($pdo, 'mysql');
            Seeder::seed($pdo, $username, $password, $displayName, $email, $enableCalendars, $enableContacts);
            self::seedAppSettings($pdo, $initialSettings);
            SchemaMigrationRunner::migrate($pdo);
            if ($pdo->inTransaction()) {
                $pdo->commit();
            }
        } catch (\Throwable $e) {
            if ($pdo->inTransaction()) {
                $pdo->rollBack();
            }
            throw $e;
        }
    }

    /**
     * @param array<string, mixed> $initialSettings
     */
    private static function seedAppSettings(\PDO $pdo, array $initialSettings): void
    {
        $allowed = array_flip(SettingsKeys::all());
        $clean = [];
        foreach ($initialSettings as $k => $v) {
            if (is_string($k) && isset($allowed[$k])) {
                $clean[$k] = $v;
            }
        }
        if ($clean !== []) {
            SettingsRepository::replaceManyDriver($pdo, $clean);
        }
    }

    /**
     * @param array<string, mixed> $db
     */
    public static function testConnection(array $db): void
    {
        $pdo = self::connect($db);
        $pdo->query('SELECT 1');
    }
}
