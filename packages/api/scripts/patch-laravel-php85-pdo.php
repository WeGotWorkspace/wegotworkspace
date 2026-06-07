<?php

declare(strict_types=1);

/**
 * PHP 8.5 deprecates PDO::MYSQL_ATTR_SSL_CA when Laravel's merged framework
 * database config is loaded. Patch vendor defaults until framework ships the fix.
 *
 * Idempotent — safe to run on every composer install/autoload dump.
 */
$databaseConfig = __DIR__.'/../vendor/laravel/framework/config/database.php';

if (! is_file($databaseConfig)) {
    exit(0);
}

$contents = (string) file_get_contents($databaseConfig);

$replacement = <<<'PHP'
'options' => (static function (): array {
                if (! extension_loaded('pdo_mysql')) {
                    return [];
                }

                $sslCa = env('MYSQL_ATTR_SSL_CA');
                if (! is_string($sslCa) || $sslCa === '') {
                    return [];
                }

                $attribute = class_exists(\Pdo\Mysql::class)
                    ? \Pdo\Mysql::ATTR_SSL_CA
                    : \PDO::MYSQL_ATTR_SSL_CA;

                return [$attribute => $sslCa];
            })(),
PHP;

$patterns = [
    "/'options' => extension_loaded\\('pdo_mysql'\\) \\? array_filter\\(\\[\\s*PDO::MYSQL_ATTR_SSL_CA => env\\('MYSQL_ATTR_SSL_CA'\\),\\s*\\]\\) : \\[\\],/s",
];

$patched = $contents;
foreach ($patterns as $pattern) {
    $patched = preg_replace($pattern, $replacement, $patched) ?? $patched;
}

if ($patched === $contents) {
    exit(0);
}

file_put_contents($databaseConfig, $patched);

fwrite(STDOUT, "Patched Laravel database config for PHP 8.5 PDO MySQL SSL constants.\n");
