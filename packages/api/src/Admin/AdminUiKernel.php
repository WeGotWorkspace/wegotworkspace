<?php

declare(strict_types=1);

namespace App\Admin;

use App\Config;
use App\Installer\WebBase;
use App\Pwa\PwaSupport;
use App\SabreUiAuthGate;
use App\Settings\SettingsKeys;

/**
 * Serves the Cloud Harmony admin web UI at {@code /admin/} with the same admin group policy as legacy admin pages.
 *
 * Source: {@code packages/admin/}; build output: {@code wgw-modules/admin/dist/}.
 */
final class AdminUiKernel
{
    public static function matchesPath(string $webBase, string $path): bool
    {
        $prefix = WebBase::url($webBase, '/admin');

        return $path === $prefix || $path === $prefix.'/' || str_starts_with($path, $prefix.'/');
    }

    public static function tryRespond(string $webBase, string $path): bool
    {
        if (!self::matchesPath($webBase, $path)) {
            return false;
        }

        $adminNoSlash = WebBase::url($webBase, '/admin');
        if ($path === $adminNoSlash) {
            self::redirectTo($webBase, '/admin/');

            return true;
        }

        try {
            $cfg = Config::load();
            $pdoCfg = Config::pdoCredentials($cfg);
            $pdo = new \PDO(
                $pdoCfg['dsn'],
                $pdoCfg['user'] ?? null,
                $pdoCfg['password'] ?? null,
                [\PDO::ATTR_ERRMODE => \PDO::ERRMODE_EXCEPTION]
            );
            $realm = (string) ($cfg[SettingsKeys::AUTH_REALM] ?? 'SabreDAV');
            $adminUser = SabreUiAuthGate::ensureAuthenticated($pdo, $realm, $webBase, $path);
            if (!AdminPolicy::isAdmin($pdo, $adminUser)) {
                http_response_code(403);
                header('Content-Type: text/html; charset=utf-8');
                echo '<!DOCTYPE html><html><head><meta charset="utf-8"><title>Forbidden</title>'
                    .PwaSupport::headMetaTags($webBase, 'admin')
                    .'</head><body>'
                    .'<h1>403 Forbidden</h1><p>Your account is authenticated but is not allowed to use the admin area.</p>'
                    .'<p>Add this user as a member of the <code>principals/groups/administrators</code> group under <strong>Groups</strong>.</p>'
                    .'</body></html>';

                return true;
            }
        } catch (\Throwable) {
            http_response_code(503);
            header('Content-Type: text/plain; charset=utf-8');
            echo 'Could not load configuration or database.';

            return true;
        }

        if (!AdminUiStatic::distReady()) {
            self::respondDistMissing($webBase);

            return true;
        }

        if (AdminUiStatic::tryServe($webBase, $path)) {
            return true;
        }

        http_response_code(404);
        header('Content-Type: text/plain; charset=utf-8');
        echo 'Not found';

        return true;
    }

    private static function redirectTo(string $webBase, string $path): void
    {
        $qs = isset($_SERVER['QUERY_STRING']) && is_string($_SERVER['QUERY_STRING']) && $_SERVER['QUERY_STRING'] !== ''
            ? '?'.$_SERVER['QUERY_STRING']
            : '';
        header('Location: '.WebBase::url($webBase, $path).$qs, true, 302);
    }

    private static function respondDistMissing(string $webBase): void
    {
        http_response_code(503);
        header('Content-Type: text/html; charset=utf-8');
        echo '<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Admin</title>';
        echo PwaSupport::headMetaTags($webBase, 'admin');
        echo '<style>body{font-family:system-ui,sans-serif;max-width:40rem;margin:2rem auto;padding:0 1rem;line-height:1.5}code{font-size:.9em;background:#f4f4f5;padding:.15rem .4rem;border-radius:4px}</style></head><body>';
        echo '<h1>Admin</h1>';
        echo '<p>The Admin UI build is missing. From the project root, run <code>pnpm --filter @wgw/admin build</code> or <code>pnpm build</code>.</p>';
        echo '<p>Source lives in <code>packages/admin/</code>; the Vite build writes to <code>wgw-modules/admin/dist/</code>.</p>';
        echo '<p class="hint">Open <code>'.htmlspecialchars(WebBase::url($webBase, '/admin/'), ENT_QUOTES, 'UTF-8').'</code> after authenticating as an admin user.</p>';
        echo '</body></html>';
    }

}
