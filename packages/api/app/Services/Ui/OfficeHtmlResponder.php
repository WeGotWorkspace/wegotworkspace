<?php

declare(strict_types=1);

namespace App\Services\Ui;

use App\Dav\Auth\SabreUiAuthGate;
use App\Services\Auth\UiSessionService;
use App\Services\Installer\InstallerWebBase;
use App\Support\AppPaths;
use App\Support\WgwSettings;
use Symfony\Component\HttpFoundation\Response;

final class OfficeHtmlResponder
{
    public function __construct(
        private AppPaths $paths,
        private UiSessionService $uiSession,
    ) {}

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

    public function tryRespond(string $webBase, string $path): ?Response
    {
        if (! $this->isInjectedHtmlPath($webBase, $path)) {
            return null;
        }

        $cfg = WgwSettings::normalized();
        if (! ($cfg[WgwSettings::FILES_ENABLED] ?? true)) {
            return response('WebDAV files are disabled for this site.', 404, [
                'Content-Type' => 'text/plain; charset=utf-8',
            ]);
        }

        $realm = (string) ($cfg[WgwSettings::AUTH_REALM] ?? 'SabreDAV');
        $username = SabreUiAuthGate::validatedUsername($realm);
        if ($username === null) {
            $return = rawurlencode($path);
            $login = InstallerWebBase::url($webBase, '/login?return='.$return);

            return redirect($login);
        }

        $index = $this->paths->officeIndex();
        $distFile = $this->resolveHtmlFile($webBase, $path, $index);
        if ($distFile === null || ! is_readable($distFile)) {
            return response(
                '<!DOCTYPE html><html><head><meta charset="utf-8"><title>Office unavailable</title></head><body>'
                .'<h1>Office UI is not built</h1>'
                .'<p>Run <code>pnpm --filter @wgw/onlyoffice-web build</code>, then reload.</p>'
                .'</body></html>',
                503,
                ['Content-Type' => 'text/html; charset=utf-8']
            );
        }

        $html = (string) file_get_contents($distFile);
        $officePath = InstallerWebBase::url($webBase, '/office/');
        $payload = [
            'base_uri' => (string) ($cfg[WgwSettings::BASE_URI] ?? '/'),
            'auth_realm' => $realm,
            'timezone' => (string) ($cfg[WgwSettings::TIMEZONE] ?? 'UTC'),
            'office_path' => $officePath,
            'username' => $username,
            // Prefer WebDAV writes; API save remains an explicit fallback mode.
            'save_transport' => 'webdav+api',
            'save_api_path' => '/api/v1/office/documents',
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

        $cookie = $this->uiSession->buildCookie($username, $realm, InstallerWebBase::url($webBase, '/'));

        return response($html, 200, [
            'Content-Type' => 'text/html; charset=utf-8',
            'Cache-Control' => 'no-store, no-cache, must-revalidate',
        ])->withCookie($cookie);
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
