<?php

declare(strict_types=1);

namespace Tests\Support;

use App\LocalConfigFile;
use App\Support\AppPaths;
use App\Support\UpdateFeedDefaults;
use App\Support\WgwDatabaseConfig;
use App\Support\WgwInstallConfig;
use Illuminate\Support\Facades\DB;

final class WgwInstallFixture
{
    public static function markInstalled(string $installRoot, string $dataDir, string $username = 'admin'): void
    {
        $installRoot = rtrim(str_replace('\\', '/', $installRoot), '/');
        $dataDir = rtrim(str_replace('\\', '/', $dataDir), '/');

        $keysDir = $dataDir.'/keys';
        if (! is_dir($keysDir) && ! @mkdir($keysDir, 0700, true) && ! is_dir($keysDir)) {
            throw new \RuntimeException('Failed to create keys directory: '.$keysDir);
        }
        $keys = AuthTestKeys::rsaPair();
        file_put_contents($dataDir.'/keys/api-jwt-private.pem', $keys['private_key']);
        file_put_contents($dataDir.'/keys/api-jwt-public.pem', $keys['public_key']);

        $relData = self::relativeToInstallRoot($installRoot, $dataDir) ?? './wgw-content';
        $relDb = self::relativeToInstallRoot($installRoot, $dataDir.'/db.sqlite') ?? $relData.'/db.sqlite';

        $written = [
            'data_dir' => $relData,
            'update_feed_url' => UpdateFeedDefaults::MANIFEST_URL,
            'pdo' => ['sqlite_file' => $relDb],
        ];
        $config = "<?php\n\ndeclare(strict_types=1);\n\nreturn ".var_export($written, true).";\n";
        file_put_contents($installRoot.'/wgw-config.php', $config);
        LocalConfigFile::clearCache();

        self::seedSqliteDatabase($dataDir.'/db.sqlite', $username);
        file_put_contents($dataDir.'/.installed', date('c')."\n");
    }

    public static function forgetInstallBindings(): void
    {
        if (! function_exists('app')) {
            return;
        }
        app()->forgetInstance(WgwInstallConfig::class);
        app()->forgetInstance(AppPaths::class);
        app()->forgetInstance(WgwDatabaseConfig::class);
    }

    /**
     * Point Laravel's {@code wgw} connection at the sqlite file from {@see markInstalled()}.
     *
     * Required when HTTP/feature tests call models after markInstalled: WgwServiceProvider
     * boot may have bound :memory: (or a dev checkout DB) before the fixture wrote config.
     */
    public static function syncDatabaseConnection(): void
    {
        if (! function_exists('app')) {
            return;
        }
        self::forgetInstallBindings();

        $db = app(WgwDatabaseConfig::class)->connectionConfig();
        config([
            'database.connections.wgw' => array_merge(
                (array) config('database.connections.wgw', []),
                $db,
            ),
        ]);
        DB::purge('wgw');
    }

    private static function seedSqliteDatabase(string $path, string $username): void
    {
        if (is_file($path)) {
            @unlink($path);
        }
        $pdo = new \PDO('sqlite:'.$path, null, null, [
            \PDO::ATTR_ERRMODE => \PDO::ERRMODE_EXCEPTION,
        ]);
        $pdo->exec(
            'CREATE TABLE users (
                id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
                username TEXT NOT NULL,
                digesta1 TEXT NOT NULL DEFAULT "",
                digest TEXT NOT NULL,
                UNIQUE(username)
            )'
        );
        $pdo->exec(
            'CREATE TABLE app_settings (
                name TEXT NOT NULL PRIMARY KEY,
                value TEXT NOT NULL
            )'
        );
        $stmt = $pdo->prepare('INSERT INTO users (username, digesta1, digest) VALUES (?, ?, ?)');
        $stmt->execute([$username, '', password_hash('secret', PASSWORD_DEFAULT)]);
    }

    private static function relativeToInstallRoot(string $installRoot, string $absolute): ?string
    {
        $absolute = rtrim(str_replace('\\', '/', $absolute), '/');
        $prefix = $installRoot.'/';
        if (! str_starts_with($absolute, $prefix)) {
            return null;
        }

        return './'.ltrim(substr($absolute, strlen($prefix)), '/');
    }
}
