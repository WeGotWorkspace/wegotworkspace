<?php

declare(strict_types=1);

namespace App\Mail;

use App\Config;
use App\Installer\WebBase;
use App\Pwa\PwaSupport;
use App\SabreUiAuthGate;
use App\Settings\SettingsKeys;

/**
 * Serves the Inkmail web UI at {@code /mail/} when WebDAV files are enabled (same auth gate as Drive: {@code /login/},
 * session cookie, or HTTP Basic).
 *
 * Source: {@code packages/apps/}; build output: {@code packages/apps/mail/dist/}.
 */
final class MailKernel
{
    public static function matchesPath(string $webBase, string $path): bool
    {
        $prefix = WebBase::url($webBase, '/mail');

        return $path === $prefix || $path === $prefix.'/' || str_starts_with($path, $prefix.'/');
    }

    public static function tryRespond(string $webBase, string $path): bool
    {
        if (!self::matchesPath($webBase, $path)) {
            return false;
        }

        $mailNoSlash = WebBase::url($webBase, '/mail');
        if ($path === $mailNoSlash) {
            self::redirectTo($webBase, '/mail/');

            return true;
        }

        $cfg = Config::load();
        if (!($cfg[SettingsKeys::FILES_ENABLED] ?? true)) {
            http_response_code(404);
            header('Content-Type: text/plain; charset=utf-8');
            echo 'WebDAV files are disabled for this site.';

            return true;
        }
        if (!($cfg[SettingsKeys::MAIL_ENABLED] ?? true)) {
            http_response_code(404);
            header('Content-Type: text/plain; charset=utf-8');
            echo 'Mail is disabled for this site.';

            return true;
        }

        $pdoCfg = Config::pdoCredentials($cfg);
        $pdo = new \PDO(
            $pdoCfg['dsn'],
            $pdoCfg['user'] ?? null,
            $pdoCfg['password'] ?? null,
            [\PDO::ATTR_ERRMODE => \PDO::ERRMODE_EXCEPTION]
        );
        $realm = (string) ($cfg[SettingsKeys::AUTH_REALM] ?? 'SabreDAV');

        if (!MailStatic::distReady()) {
            self::respondDistMissing($webBase);

            return true;
        }

        SabreUiAuthGate::ensureAuthenticated($pdo, $realm, $webBase, $path);

        if (MailStatic::tryServe($webBase, $path)) {
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
        echo '<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Mail</title>';
        echo PwaSupport::headMetaTags($webBase, 'mail');
        echo '<style>body{font-family:system-ui,sans-serif;max-width:40rem;margin:2rem auto;padding:0 1rem;line-height:1.5}code{font-size:.9em;background:#f4f4f5;padding:.15rem .4rem;border-radius:4px}</style></head><body>';
        echo '<h1>Mail</h1>';
        echo '<p>The Mail UI build is missing. From the project root, run <code>pnpm --filter @wgw/apps build</code> or <code>pnpm build</code>.</p>';
        echo '<p>Source lives in <code>packages/apps/</code>; app builds write to <code>packages/apps/mail/dist/</code>.</p>';
        echo '<p class="hint">Open <code>'.htmlspecialchars(WebBase::url($webBase, '/mail/'), ENT_QUOTES, 'UTF-8').'</code> after signing in at <code>'.htmlspecialchars(WebBase::url($webBase, '/login/'), ENT_QUOTES, 'UTF-8').'</code> (or use HTTP Basic).</p>';
        echo '</body></html>';
    }
}
