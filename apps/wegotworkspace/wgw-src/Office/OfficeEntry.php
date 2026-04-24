<?php

declare(strict_types=1);

namespace App\Office;

use App\Config;
use App\Installer\WebBase;
use App\Paths;
use App\SabreUiAuthGate;
use App\Settings\SettingsKeys;

/**
 * Serves ZIZIYI Office (https://github.com/baotlake/office-website) at {@code /office/} when WebDAV files are enabled.
 * Injects {@code window.__SABRE_OFFICE_CONFIG__} into HTML shells (AGPL-3.0 upstream).
 */
final class OfficeEntry
{
    public static function isInjectedHtmlPath(string $webBase, string $path): bool
    {
        $home = WebBase::url($webBase, '/office');
        if ($path === $home || $path === $home.'/') {
            return true;
        }
        if ($path === $home.'/index.html') {
            return true;
        }

        $editor = WebBase::url($webBase, '/office/editor');
        if ($path === $editor || $path === $editor.'/') {
            return true;
        }
        if ($path === $editor.'.html') {
            return true;
        }

        return false;
    }

    public static function resolveHtmlFile(string $webBase, string $path): ?string
    {
        $root = Paths::officeUiBuild();
        $home = WebBase::url($webBase, '/office');
        $editor = WebBase::url($webBase, '/office/editor');

        if ($path === $home || $path === $home.'/' || $path === $home.'/index.html') {
            return $root.'/index.html';
        }
        if ($path === $editor || $path === $editor.'/' || $path === $editor.'.html') {
            return $root.'/editor.html';
        }

        return null;
    }

    public static function tryRespondInjectedHtml(string $webBase, string $path): bool
    {
        if (!self::isInjectedHtmlPath($webBase, $path)) {
            return false;
        }

        try {
            $cfg = Config::load();
        } catch (\Throwable) {
            http_response_code(503);
            header('Content-Type: text/plain; charset=utf-8');
            echo 'Could not load configuration.';

            return true;
        }

        if (!($cfg[SettingsKeys::FILES_ENABLED] ?? true)) {
            http_response_code(404);
            header('Content-Type: text/plain; charset=utf-8');
            echo 'WebDAV files are disabled for this site.';

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
        $username = SabreUiAuthGate::ensureAuthenticated($pdo, $realm, $webBase, $path);

        $distFile = self::resolveHtmlFile($webBase, $path);
        if ($distFile === null || !is_readable($distFile)) {
            http_response_code(503);
            header('Content-Type: text/html; charset=utf-8');
            echo '<!DOCTYPE html><html><head><meta charset="utf-8"><title>Office unavailable</title></head><body>';
            echo '<h1>Office UI is not built</h1>';
            echo '<p>Run <code>pnpm --filter @wgw/docs build</code> or <code>bash packages/docs/scripts/sync-and-build.sh</code> (output: <code>apps/wegotworkspace/wgw-modules/docs/build/</code>), then reload.</p>';
            echo '</body></html>';

            return true;
        }

        $html = (string) file_get_contents($distFile);
        $officePath = WebBase::url($webBase, '/office/');
        $payload = [
            'base_uri' => (string) ($cfg[SettingsKeys::BASE_URI] ?? '/'),
            'auth_realm' => (string) ($cfg[SettingsKeys::AUTH_REALM] ?? 'SabreDAV'),
            'timezone' => (string) ($cfg[SettingsKeys::TIMEZONE] ?? 'UTC'),
            'office_path' => $officePath,
            'username' => $username,
        ];
        $json = json_encode(
            $payload,
            JSON_THROW_ON_ERROR | JSON_HEX_TAG | JSON_HEX_APOS | JSON_HEX_AMP | JSON_HEX_QUOT | JSON_UNESCAPED_SLASHES
        );

        $inject = '<script>window.__SABRE_OFFICE_CONFIG__='.$json.';</script>';

        if (preg_match('#<head[^>]*>#i', $html, $m, PREG_OFFSET_CAPTURE)) {
            $tag = $m[0][0];
            $pos = $m[0][1] + strlen($tag);
            $html = substr($html, 0, $pos)."\n".$inject.substr($html, $pos);
        } elseif (str_contains($html, '</head>')) {
            $html = str_replace('</head>', $inject."\n</head>", $html);
        } else {
            $html = $inject."\n".$html;
        }

        header('Content-Type: text/html; charset=utf-8');
        header('Cache-Control: no-store, no-cache, must-revalidate');
        echo $html;

        return true;
    }
}
