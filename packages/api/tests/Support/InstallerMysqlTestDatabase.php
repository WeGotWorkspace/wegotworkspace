<?php

declare(strict_types=1);

namespace Tests\Support;

/**
 * Isolated MySQL database for installer feature tests (api-mysql CI job or local MySQL).
 */
final class InstallerMysqlTestDatabase
{
    public static function isAvailable(): bool
    {
        if (! extension_loaded('pdo_mysql')) {
            return false;
        }

        try {
            self::adminPdo();

            return true;
        } catch (\Throwable) {
            return false;
        }
    }

    public static function createIsolated(): string
    {
        $name = 'wgw_inst_'.bin2hex(random_bytes(8));
        $pdo = self::adminPdo();
        $pdo->exec(
            'CREATE DATABASE `'.$name.'` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci',
        );

        return $name;
    }

    public static function drop(string $database): void
    {
        if (! preg_match('/^wgw_inst_[a-f0-9]{16}$/', $database)) {
            return;
        }

        try {
            self::adminPdo()->exec('DROP DATABASE IF EXISTS `'.$database.'`');
        } catch (\Throwable) {
            // Best-effort cleanup for ephemeral CI databases.
        }
    }

    /**
     * @return array{
     *     db_driver: string,
     *     mysql_host: string,
     *     mysql_port: int,
     *     mysql_db: string,
     *     mysql_user: string,
     *     mysql_password: string
     * }
     */
    public static function installerPayload(string $database): array
    {
        $admin = self::adminConfig();

        return [
            'db_driver' => 'mysql',
            'mysql_host' => $admin['host'],
            'mysql_port' => $admin['port'],
            'mysql_db' => $database,
            'mysql_user' => $admin['user'],
            'mysql_password' => $admin['password'],
        ];
    }

    /**
     * @return array{host: string, port: int, user: string, password: string}
     */
    private static function adminConfig(): array
    {
        return [
            'host' => getenv('WGW_TEST_MYSQL_HOST') ?: '127.0.0.1',
            'port' => (int) (getenv('WGW_TEST_MYSQL_PORT') ?: 3306),
            'user' => getenv('WGW_TEST_MYSQL_USERNAME') ?: 'root',
            'password' => getenv('WGW_TEST_MYSQL_PASSWORD') ?: '',
        ];
    }

    private static function adminPdo(): \PDO
    {
        $admin = self::adminConfig();
        $dsn = sprintf(
            'mysql:host=%s;port=%d;charset=utf8mb4',
            $admin['host'],
            $admin['port'],
        );

        return new \PDO($dsn, $admin['user'], $admin['password'], wgw_mysql_pdo_options());
    }
}
