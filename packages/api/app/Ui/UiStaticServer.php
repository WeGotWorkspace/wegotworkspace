<?php

declare(strict_types=1);

namespace App\Ui;

use App\Services\Installer\InstallerWebBase;

/**
 * Serves built SPA assets from a module dist directory (shell, drive, install, …).
 */
final class UiStaticServer
{
    /** @var list<string> */
    private const GLOBAL_PREFIXES = [
        '/assets',
        '/fonts',
        '/icons',
        '/manifests',
    ];

    public function distReady(string $distRoot): bool
    {
        return is_file(rtrim($distRoot, '/').'/index.html');
    }

    public function matchesShellPath(string $webBase, string $path): bool
    {
        /** @var list<string> */
        $routePrefixes = [
            '/',
            '/admin',
            '/drive',
            '/login',
            '/logout',
            '/mail',
            '/meet',
            '/notes',
            '/settings',
            '/voice',
            '/office',
        ];

        foreach (self::GLOBAL_PREFIXES as $prefix) {
            $full = InstallerWebBase::url($webBase, $prefix);
            if ($path === $full || str_starts_with($path, $full.'/')) {
                return true;
            }
        }

        foreach ($routePrefixes as $prefix) {
            $full = InstallerWebBase::url($webBase, $prefix);
            if ($path === $full || $path === $full.'/' || str_starts_with($path, $full.'/')) {
                return true;
            }
        }

        return false;
    }

    public function matchesInstallPath(string $webBase, string $path): bool
    {
        $prefix = InstallerWebBase::url($webBase, '/install');

        return $path === $prefix || $path === $prefix.'/' || str_starts_with($path, $prefix.'/');
    }

    public function tryServe(string $distRoot, string $webBase, string $path, bool $spaFallback): bool
    {
        $root = rtrim($distRoot, '/');
        if (! $this->distReady($root)) {
            return false;
        }

        foreach (self::GLOBAL_PREFIXES as $prefix) {
            $full = InstallerWebBase::url($webBase, $prefix);
            if ($path !== $full && ! str_starts_with($path, $full.'/')) {
                continue;
            }
            $suffix = $path === $full ? '' : substr($path, strlen($full) + 1);
            $suffix = is_string($suffix) ? $suffix : '';
            $rel = ltrim($prefix, '/').($suffix !== '' ? '/'.str_replace('\\', '/', rawurldecode($suffix)) : '');

            return $this->serveResolvedPath($root, $rel, false);
        }

        $routePrefix = $this->matchedRoutePrefix($webBase, $path);
        if ($routePrefix === null) {
            return false;
        }

        $rel = $this->relativePath($path, $routePrefix);

        return $this->serveResolvedPath($root, $rel, $spaFallback);
    }

    private function matchedRoutePrefix(string $webBase, string $path): ?string
    {
        /** @var list<string> */
        $routePrefixes = [
            '/',
            '/admin',
            '/drive',
            '/login',
            '/logout',
            '/mail',
            '/meet',
            '/notes',
            '/settings',
            '/voice',
            '/office',
            '/install',
        ];

        foreach ($routePrefixes as $prefix) {
            $full = InstallerWebBase::url($webBase, $prefix);
            if ($path === $full || $path === $full.'/' || str_starts_with($path, $full.'/')) {
                return $full;
            }
        }

        return null;
    }

    private function relativePath(string $path, string $prefix): string
    {
        if ($path === $prefix || $path === $prefix.'/') {
            return '';
        }
        $relative = substr($path, strlen($prefix) + 1);

        return is_string($relative) ? str_replace('\\', '/', rawurldecode($relative)) : '';
    }

    private function serveResolvedPath(string $root, string $rel, bool $allowSpaFallback): bool
    {
        if ($rel !== '' && (str_contains($rel, "\0") || str_contains($rel, '..'))) {
            $this->respondNotFound();

            return true;
        }

        $fs = $this->mapUrlToFilesystem($root, $rel);
        if ($fs === null) {
            if ($rel !== '' && preg_match('#^(css|js|img|fonts|assets|icons|manifests)/#', $rel) === 1) {
                $this->respondNotFound();

                return true;
            }
            if (! $allowSpaFallback) {
                $this->respondNotFound();

                return true;
            }
            $index = $root.'/index.html';
            $looksLikeAsset = $rel !== '' && preg_match('/\.[A-Za-z0-9]{1,8}$/', $rel) === 1;
            if (is_file($index) && ! str_starts_with($rel, 'assets/') && ! $looksLikeAsset) {
                $fs = $index;
            } else {
                return false;
            }
        }

        $realRoot = realpath($root);
        $realFile = is_readable($fs) ? realpath($fs) : false;
        if ($realRoot === false || $realFile === false || ! str_starts_with($realFile, $realRoot)) {
            $this->respondNotFound();

            return true;
        }

        $ext = strtolower(pathinfo($realFile, PATHINFO_EXTENSION));
        $mime = match ($ext) {
            'js', 'mjs' => 'application/javascript; charset=utf-8',
            'css' => 'text/css; charset=utf-8',
            'html', 'htm' => 'text/html; charset=utf-8',
            'json', 'map' => 'application/json; charset=utf-8',
            'svg' => 'image/svg+xml',
            'png' => 'image/png',
            'jpg', 'jpeg' => 'image/jpeg',
            'webp' => 'image/webp',
            'ico' => 'image/x-icon',
            'gif' => 'image/gif',
            'woff' => 'font/woff',
            'woff2' => 'font/woff2',
            'ttf' => 'font/ttf',
            'otf' => 'font/otf',
            'txt' => 'text/plain; charset=utf-8',
            'xml' => 'application/xml; charset=utf-8',
            'webmanifest' => 'application/manifest+json; charset=utf-8',
            default => 'application/octet-stream',
        };

        header('Content-Type: '.$mime);
        if ($ext === 'html' || $ext === 'htm') {
            header('Cache-Control: no-store, no-cache, must-revalidate');
        } else {
            header('Cache-Control: public, max-age=86400');
        }

        readfile($realFile);

        return true;
    }

    private function mapUrlToFilesystem(string $root, string $rel): ?string
    {
        $rel = ltrim($rel, '/');
        if ($rel === '') {
            return null;
        }
        $direct = $root.'/'.$rel;

        return is_file($direct) ? $direct : null;
    }

    private function respondNotFound(): void
    {
        http_response_code(404);
        header('Content-Type: text/plain; charset=utf-8');
        echo 'Not found';
    }
}
