<?php

declare(strict_types=1);

namespace App\Support;

/**
 * Maps install {@code wgw-config.php} PDO settings to a Laravel {@code wgw} connection.
 */
final class WgwDatabaseConfig
{
    public function __construct(private WgwInstallConfig $install) {}

    /**
     * @return array{
     *     driver: string,
     *     database: string,
     *     username: ?string,
     *     password: ?string,
     *     foreign_key_constraints: bool
     * }
     */
    public function connectionConfig(): array
    {
        $credentials = $this->pdoCredentials();

        if (str_starts_with($credentials['dsn'], 'sqlite:')) {
            $database = substr($credentials['dsn'], 7);
            if ($database === '') {
                $database = ':memory:';
            }

            return [
                'driver' => 'sqlite',
                'database' => $database,
                'username' => null,
                'password' => null,
                'foreign_key_constraints' => true,
            ];
        }

        $parsed = $this->parseMysqlDsn($credentials['dsn']);

        return array_merge($parsed, [
            'driver' => 'mysql',
            'username' => $credentials['user'],
            'password' => $credentials['password'],
            'charset' => 'utf8mb4',
            'collation' => 'utf8mb4_unicode_ci',
            'prefix' => '',
            'prefix_indexes' => true,
            'strict' => true,
            'engine' => null,
            'options' => [],
            'foreign_key_constraints' => true,
        ]);
    }

    /**
     * @return array{host: string, port: string, database: string}
     */
    private function parseMysqlDsn(string $dsn): array
    {
        $body = str_starts_with($dsn, 'mysql:') ? substr($dsn, 6) : $dsn;
        $params = [];
        foreach (explode(';', $body) as $part) {
            if (! str_contains($part, '=')) {
                continue;
            }
            [$key, $value] = explode('=', $part, 2);
            $params[strtolower(trim($key))] = trim($value);
        }

        return [
            'host' => $params['host'] ?? '127.0.0.1',
            'port' => $params['port'] ?? '3306',
            'database' => $params['dbname'] ?? '',
        ];
    }

    /**
     * @return array{dsn: string, user: ?string, password: ?string}
     */
    public function pdoCredentials(): array
    {
        $file = $this->install->readInstallFileConfig();
        $pdo = $file['pdo'] ?? null;
        if (! is_array($pdo)) {
            return [
                'dsn' => 'sqlite::memory:',
                'user' => null,
                'password' => null,
            ];
        }

        if (isset($pdo['sqlite_file']) && is_string($pdo['sqlite_file']) && $pdo['sqlite_file'] !== '') {
            $abs = $this->install->resolveInstallPath($pdo['sqlite_file']);

            return [
                'dsn' => 'sqlite:'.$abs,
                'user' => null,
                'password' => null,
            ];
        }

        $dsn = (string) ($pdo['dsn'] ?? '');
        if ($dsn === '') {
            return [
                'dsn' => 'sqlite::memory:',
                'user' => null,
                'password' => null,
            ];
        }

        if (str_starts_with($dsn, 'sqlite:')) {
            $file = substr($dsn, 7);
            if ($file !== '' && ! $this->isAbsolutePath($file)) {
                $dsn = 'sqlite:'.$this->install->resolveInstallPath($file);
            }
        }

        return [
            'dsn' => $dsn,
            'user' => isset($pdo['user']) && is_string($pdo['user']) ? $pdo['user'] : null,
            'password' => isset($pdo['password']) && is_string($pdo['password']) ? $pdo['password'] : null,
        ];
    }

    private function isAbsolutePath(string $path): bool
    {
        if ($path !== '' && $path[0] === '/') {
            return true;
        }

        return \PHP_OS_FAMILY === 'Windows'
            && strlen($path) > 2
            && ctype_alpha($path[0])
            && $path[1] === ':';
    }
}
