<?php

declare(strict_types=1);

namespace App\Installer;

use App\Paths;

/**
 * Serves install wizard static assets from {@code packages/install-ui/} build output.
 */
final class InstallerStatic
{
    public static function distRoot(): string
    {
        return Paths::installDist();
    }

    public static function distReady(): bool
    {
        return is_file(self::distRoot().'/index.html');
    }

    public static function tryServe(string $webBase, string $path): bool
    {
        $prefix = WebBase::url($webBase, '/install');
        if ($path !== $prefix && !str_starts_with($path, $prefix.'/')) {
            return false;
        }

        $root = self::distRoot();
        $rel = $path === $prefix || $path === $prefix.'/' ? '' : substr($path, strlen($prefix) + 1);
        $rel = rawurldecode(str_replace('\\', '/', (string) $rel));

        if ($rel !== '' && (str_contains($rel, "\0") || str_contains($rel, '..'))) {
            http_response_code(404);
            header('Content-Type: text/plain; charset=utf-8');
            echo 'Not found';

            return true;
        }

        $fs = self::mapUrlToFilesystem($root, $rel);
        if ($fs === null) {
            $accept = (string) ($_SERVER['HTTP_ACCEPT'] ?? '');
            $index = $root.'/index.html';
            if (is_file($index) && str_contains($accept, 'text/html') && !str_starts_with($rel, 'assets/')) {
                $fs = $index;
            } else {
                return false;
            }
        }

        $realRoot = realpath($root);
        $realFile = is_readable($fs) ? realpath($fs) : false;
        if ($realRoot === false || $realFile === false || !str_starts_with($realFile, $realRoot)) {
            http_response_code(404);
            header('Content-Type: text/plain; charset=utf-8');
            echo 'Not found';

            return true;
        }

        $ext = strtolower(pathinfo($realFile, PATHINFO_EXTENSION));
        $mime = match ($ext) {
            'js' => 'application/javascript; charset=utf-8',
            'mjs' => 'application/javascript; charset=utf-8',
            'css' => 'text/css; charset=utf-8',
            'html' => 'text/html; charset=utf-8',
            'htm' => 'text/html; charset=utf-8',
            'json' => 'application/json; charset=utf-8',
            'svg' => 'image/svg+xml',
            'png' => 'image/png',
            'jpg', 'jpeg' => 'image/jpeg',
            'webp' => 'image/webp',
            'ico' => 'image/x-icon',
            'woff' => 'font/woff',
            'woff2' => 'font/woff2',
            'txt' => 'text/plain; charset=utf-8',
            'map' => 'application/json; charset=utf-8',
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

    private static function mapUrlToFilesystem(string $root, string $rel): ?string
    {
        $rel = ltrim($rel, '/');
        if ($rel === '') {
            return null;
        }

        $direct = $root.'/'.$rel;
        if (is_file($direct)) {
            return $direct;
        }

        return null;
    }
}
