<?php

declare(strict_types=1);

namespace App\AppShell;

use App\Installer\WebBase;
use App\Paths;

final class AppShellStatic
{
    private const ROUTE_PREFIXES = [
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
    ];
    private const GLOBAL_PREFIXES = [
        '/assets',
        '/fonts',
        '/icons',
        '/manifests',
    ];

    public static function distRoot(): string
    {
        return Paths::shellDist();
    }

    public static function distReady(): bool
    {
        return is_file(self::distRoot().'/index.html');
    }

    public static function matchesPath(string $webBase, string $path): bool
    {
        foreach (self::GLOBAL_PREFIXES as $prefix) {
            $fullPrefix = WebBase::url($webBase, $prefix);
            if ($path === $fullPrefix || str_starts_with($path, $fullPrefix.'/')) {
                return true;
            }
        }

        foreach (self::ROUTE_PREFIXES as $prefix) {
            $fullPrefix = WebBase::url($webBase, $prefix);
            if ($path === $fullPrefix || $path === $fullPrefix.'/' || str_starts_with($path, $fullPrefix.'/')) {
                return true;
            }
        }

        return false;
    }

    public static function tryServe(string $webBase, string $path): bool
    {
        foreach (self::GLOBAL_PREFIXES as $prefix) {
            $fullPrefix = WebBase::url($webBase, $prefix);
            if ($path !== $fullPrefix && !str_starts_with($path, $fullPrefix.'/')) {
                continue;
            }
            $root = self::distRoot();
            $suffix = $path === $fullPrefix ? '' : substr($path, strlen($fullPrefix) + 1);
            $suffix = is_string($suffix) ? $suffix : '';
            $rel = ltrim($prefix, '/').($suffix !== '' ? '/'.str_replace('\\', '/', rawurldecode($suffix)) : '');
            if (self::serveResolvedPath($root, $rel, false)) {
                return true;
            }

            return false;
        }

        $routePrefix = self::matchedPrefix($webBase, $path);
        if ($routePrefix === null) {
            return false;
        }

        $root = self::distRoot();
        $rel = self::relativePath($path, $routePrefix);
        return self::serveResolvedPath($root, $rel, true);
    }

    private static function matchedPrefix(string $webBase, string $path): ?string
    {
        foreach (self::ROUTE_PREFIXES as $prefix) {
            $fullPrefix = WebBase::url($webBase, $prefix);
            if ($path === $fullPrefix || $path === $fullPrefix.'/' || str_starts_with($path, $fullPrefix.'/')) {
                return $fullPrefix;
            }
        }

        return null;
    }

    private static function relativePath(string $path, string $prefix): string
    {
        if ($path === $prefix || $path === $prefix.'/') {
            return '';
        }
        $relative = substr($path, strlen($prefix) + 1);
        if (!is_string($relative)) {
            return '';
        }

        return str_replace('\\', '/', rawurldecode($relative));
    }

    private static function mapUrlToFilesystem(string $root, string $rel): ?string
    {
        $rel = ltrim($rel, '/');
        if ($rel === '') {
            return null;
        }
        $direct = $root.'/'.$rel;

        return is_file($direct) ? $direct : null;
    }

    private static function serveResolvedPath(string $root, string $rel, bool $allowSpaFallback): bool
    {
        if ($rel !== '' && (str_contains($rel, "\0") || str_contains($rel, '..'))) {
            self::respond404();

            return true;
        }

        $fs = self::mapUrlToFilesystem($root, $rel);
        if ($fs === null) {
            if ($rel !== '' && preg_match('#^(css|js|img|fonts|assets|icons|manifests)/#', $rel) === 1) {
                self::respond404();

                return true;
            }
            if (!$allowSpaFallback) {
                self::respond404();

                return true;
            }
            $index = $root.'/index.html';
            $looksLikeAsset = $rel !== '' && preg_match('/\.[A-Za-z0-9]{1,8}$/', $rel) === 1;
            if (is_file($index) && !str_starts_with($rel, 'assets/') && !$looksLikeAsset) {
                $fs = $index;
            } else {
                return false;
            }
        }

        $realRoot = realpath($root);
        $realFile = is_readable($fs) ? realpath($fs) : false;
        if ($realRoot === false || $realFile === false || !str_starts_with($realFile, $realRoot)) {
            self::respond404();

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

    private static function respond404(): void
    {
        http_response_code(404);
        header('Content-Type: text/plain; charset=utf-8');
        echo 'Not found';
    }
}
