<?php

declare(strict_types=1);

namespace Tests\Support;

use Illuminate\Support\Facades\DB;

final class WgwTestDatabase
{
    public static function driver(): string
    {
        $driver = getenv('WGW_TEST_DRIVER');
        if (is_string($driver) && $driver !== '') {
            return $driver;
        }

        return 'sqlite';
    }

    public static function configureConnection(string $driver): void
    {
        if ($driver === 'mysql') {
            config([
                'database.connections.wgw' => [
                    'driver' => 'mysql',
                    'host' => getenv('WGW_TEST_MYSQL_HOST') ?: '127.0.0.1',
                    'port' => getenv('WGW_TEST_MYSQL_PORT') ?: '3306',
                    'database' => getenv('WGW_TEST_MYSQL_DATABASE') ?: 'wgw_test',
                    'username' => getenv('WGW_TEST_MYSQL_USERNAME') ?: 'root',
                    'password' => getenv('WGW_TEST_MYSQL_PASSWORD') ?: '',
                    'charset' => 'utf8mb4',
                    'collation' => 'utf8mb4_unicode_ci',
                    'prefix' => '',
                    'prefix_indexes' => true,
                    'strict' => true,
                    'engine' => null,
                    'options' => wgw_mysql_pdo_options(),
                    'foreign_key_constraints' => true,
                ],
            ]);
            DB::purge('wgw');

            return;
        }

        config([
            'database.connections.wgw' => [
                'driver' => 'sqlite',
                'database' => ':memory:',
                'prefix' => '',
                'foreign_key_constraints' => true,
            ],
        ]);
        DB::purge('wgw');
    }
}
