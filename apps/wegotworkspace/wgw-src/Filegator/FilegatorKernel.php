<?php

declare(strict_types=1);

namespace App\Filegator;

use App\Config;
use App\Installer\WebBase;
use App\Paths;
use App\SabreUiAuthGate;
use App\Settings\SettingsKeys;
use Filegator\App;
use Filegator\Config\Config as FgConfig;
use Filegator\Container\Container;
use Filegator\Kernel\Request;
use Filegator\Kernel\Response;
use Filegator\Kernel\StreamedResponse;

/**
 * Runs the Drive UI (see {@code packages/drive-ui/}) at {@code /drive/}, with the FileGator PHP JSON API on the same process.
 *
 * Storage defaults to the same on-disk tree as WebDAV under {@code wgw-content/files/} (Flysystem local).
 * Optional WebDAV storage: set {@code filegator} in {@code wgw-config.php} (see {@see FilegatorConfigBuilder}).
 */
final class FilegatorKernel
{
    public static function matchesPath(string $webBase, string $path): bool
    {
        $prefix = WebBase::url($webBase, '/drive');

        return $path === $prefix || $path === $prefix.'/' || str_starts_with($path, $prefix.'/');
    }

    public static function tryRespond(string $webBase, string $path): bool
    {
        if (!self::matchesPath($webBase, $path)) {
            return false;
        }

        $cfg = Config::load();
        if (!($cfg[SettingsKeys::FILES_ENABLED] ?? true)) {
            http_response_code(404);
            header('Content-Type: text/plain; charset=utf-8');
            echo 'WebDAV files are disabled for this site.';

            return true;
        }

        self::ensureRuntime();

        $pdoCfg = Config::pdoCredentials($cfg);
        $pdo = new \PDO(
            $pdoCfg['dsn'],
            $pdoCfg['user'] ?? null,
            $pdoCfg['password'] ?? null,
            [\PDO::ATTR_ERRMODE => \PDO::ERRMODE_EXCEPTION]
        );
        $realm = (string) ($cfg[SettingsKeys::AUTH_REALM] ?? 'SabreDAV');

        if (FilegatorStatic::distReady()) {
            SabreUiAuthGate::ensureAuthenticated($pdo, $realm, $webBase, $path);
        }

        if (FilegatorStatic::tryServe($webBase, $path)) {
            return true;
        }

        if (!FilegatorStatic::distReady()) {
            self::respondDistMissing($webBase);

            return true;
        }

        if (!defined('APP_ENV')) {
            define('APP_ENV', 'production');
        }
        if (!defined('APP_PUBLIC_PATH')) {
            define('APP_PUBLIC_PATH', WebBase::url($webBase, '/drive/'));
        }
        if (!defined('APP_PUBLIC_DIR')) {
            define('APP_PUBLIC_DIR', FilegatorStatic::distRoot());
        }
        if (!defined('APP_VERSION')) {
            define('APP_VERSION', \Composer\InstalledVersions::getPrettyVersion('filegator/filegator') ?? '7.14.0');
        }

        // FileGator 7.x depends on older Symfony components that emit PHP 8.4 deprecations.
        // Avoid leaking deprecation text into JSON API responses ("Unknown error" in UI).
        $prevErrors = error_reporting();
        error_reporting($prevErrors & ~E_DEPRECATED & ~E_USER_DEPRECATED);
        try {
            $fgCfg = FilegatorConfigBuilder::build($webBase);
            new App(
                new FgConfig($fgCfg),
                Request::createFromGlobals(),
                new Response(),
                new StreamedResponse(),
                new Container()
            );
        } finally {
            error_reporting($prevErrors);
        }

        return true;
    }

    private static function ensureRuntime(): void
    {
        $base = Paths::filegatorData();
        foreach ([$base, $base.'/logs', $base.'/tmp', $base.'/sessions'] as $dir) {
            if (!is_dir($dir)) {
                @mkdir($dir, 0775, true);
            }
        }

    }

    private static function respondDistMissing(string $webBase): void
    {
        http_response_code(503);
        header('Content-Type: text/html; charset=utf-8');
        echo '<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Drive</title>';
        echo '<style>body{font-family:system-ui,sans-serif;max-width:40rem;margin:2rem auto;padding:0 1rem;line-height:1.5}code{font-size:.9em;background:#f4f4f5;padding:.15rem .4rem;border-radius:4px}</style></head><body>';
        echo '<h1>Drive</h1>';
        echo '<p>The Drive UI build is missing. From the project root, run <code>pnpm --filter @wgw/drive-ui build</code> or <code>pnpm build</code>.</p>';
        echo '<p>Source lives in <code>packages/drive-ui/</code>; the Vite build writes to <code>wgw-modules/drive/dist/</code>.</p>';
        echo '<p class="hint">Open <code>/drive/</code> after signing in at <code>/login/</code>, or use HTTP Basic like WebDAV clients.</p>';
        echo '</body></html>';
    }
}
