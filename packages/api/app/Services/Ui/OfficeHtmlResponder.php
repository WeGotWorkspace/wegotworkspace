<?php

declare(strict_types=1);

namespace App\Services\Ui;

use App\Dav\Auth\SabreUiAuthGate;
use App\Services\Installer\InstallerWebBase;
use App\Support\AppPaths;
use App\Support\WgwSettings;

final class OfficeHtmlResponder
{
    public function __construct(private AppPaths $paths)
    {
    }

    public function isInjectedHtmlPath(string $webBase, string $path): bool
    {
        $home = InstallerWebBase::url($webBase, '/office');
        if ($path === $home || $path === $home.'/') {
            return true;
        }
        if ($path === $home.'/index.html') {
            return true;
        }

        $editor = InstallerWebBase::url($webBase, '/office/editor');
        if ($path === $editor || $path === $editor.'/' || $path === $editor.'.html') {
            return true;
        }

        return false;
    }

    public function tryRespond(string $webBase, string $path): bool
    {
        if (! $this->isInjectedHtmlPath($webBase, $path)) {
            return false;
        }

        $cfg = WgwSettings::normalized();
        if (! ($cfg[WgwSettings::FILES_ENABLED] ?? true)) {
            http_response_code(404);
            header('Content-Type: text/plain; charset=utf-8');
            echo 'WebDAV files are disabled for this site.';

            return true;
        }

        $realm = (string) ($cfg[WgwSettings::AUTH_REALM] ?? 'SabreDAV');
        $username = SabreUiAuthGate::validatedUsername($realm);
        if ($username === null) {
            $return = rawurlencode($path);
            $login = InstallerWebBase::url($webBase, '/login?return='.$return);
            header('Location: '.$login, true, 302);

            return true;
        }

        $index = $this->paths->officeIndex();
        $distFile = $this->resolveHtmlFile($webBase, $path, $index);
        if ($distFile === null || ! is_readable($distFile)) {
            http_response_code(503);
            header('Content-Type: text/html; charset=utf-8');
            echo '<!DOCTYPE html><html><head><meta charset="utf-8"><title>Office unavailable</title></head><body>';
            echo '<h1>Office UI is not built</h1>';
            echo '<p>Run <code>pnpm --filter @wgw/onlyoffice-web build</code>, then reload.</p>';
            echo '</body></html>';

            return true;
        }

        $html = (string) file_get_contents($distFile);
        $officePath = InstallerWebBase::url($webBase, '/office/');
        $payload = [
            'base_uri' => (string) ($cfg[WgwSettings::BASE_URI] ?? '/'),
            'auth_realm' => $realm,
            'timezone' => (string) ($cfg[WgwSettings::TIMEZONE] ?? 'UTC'),
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

    private function resolveHtmlFile(string $webBase, string $path, ?string $indexPath): ?string
    {
        if ($indexPath === null) {
            return null;
        }
        $root = dirname($indexPath);
        $home = InstallerWebBase::url($webBase, '/office');
        $editor = InstallerWebBase::url($webBase, '/office/editor');

        if ($path === $home || $path === $home.'/' || $path === $home.'/index.html') {
            return $indexPath;
        }
        if ($path === $editor || $path === $editor.'/' || $path === $editor.'.html') {
            $flat = $root.'/editor.html';
            if (is_readable($flat)) {
                return $flat;
            }

            return $root.'/editor/index.html';
        }

        return null;
    }
}
