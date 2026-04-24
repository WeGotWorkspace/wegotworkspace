<?php

declare(strict_types=1);

namespace App\UserSettings;

use App\Installer\WebBase;
use App\Paths;

final class UserSettingsUiStatic
{
    public static function distRoot(): string
    {
        return Paths::userSettingsDist();
    }

    public static function distReady(): bool
    {
        return is_file(self::distRoot().'/index.html');
    }

    public static function tryServe(string $webBase, string $path): bool
    {
        $prefix = WebBase::url($webBase, '/settings');
        if ($path !== $prefix && !str_starts_with($path, $prefix.'/')) {
            return false;
        }

        $root = self::distRoot();
        $rel = $path === $prefix || $path === $prefix.'/' ? '' : substr($path, strlen($prefix) + 1);
        $rel = str_replace('\\', '/', (string) $rel);
        $rel = rawurldecode($rel);
        if ($rel !== '' && (str_contains($rel, "\0") || str_contains($rel, '..'))) {
            http_response_code(404);
            header('Content-Type: text/plain; charset=utf-8');
            echo 'Not found';

            return true;
        }

        $fs = self::mapUrlToFilesystem($root, $rel);
        if ($fs === null) {
            if ($rel !== '' && preg_match('#^assets/#', $rel) === 1) {
                http_response_code(404);
                header('Content-Type: text/plain; charset=utf-8');
                echo 'Not found';

                return true;
            }
            $index = $root.'/index.html';
            if (!is_file($index)) {
                return false;
            }
            $fs = $index;
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
            default => 'application/octet-stream',
        };
        header('Content-Type: '.$mime);
        if ($ext === 'html' || $ext === 'htm') {
            header('Cache-Control: no-store, no-cache, must-revalidate');
            $html = (string) file_get_contents($realFile);
            if (basename($realFile) === 'index.html') {
                $https = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off')
                    || (isset($_SERVER['HTTP_X_FORWARDED_PROTO']) && $_SERVER['HTTP_X_FORWARDED_PROTO'] === 'https');
                $scheme = $https ? 'https' : 'http';
                $host = $_SERVER['HTTP_HOST'] ?? 'localhost';
                $baseHref = $scheme.'://'.$host.WebBase::url($webBase, '/settings/');
                $inject = '<base href="'.htmlspecialchars($baseHref, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8').'">';
                if (preg_match('#<head[^>]*>#i', $html, $m, PREG_OFFSET_CAPTURE)) {
                    $tag = $m[0][0];
                    $pos = $m[0][1] + strlen($tag);
                    $html = substr($html, 0, $pos)."\n".$inject.substr($html, $pos);
                } elseif (str_contains($html, '</head>')) {
                    $html = str_replace('</head>', $inject."\n</head>", $html);
                } else {
                    $html = $inject."\n".$html;
                }
            }
            echo $html;
        } else {
            header('Cache-Control: public, max-age=86400');
            readfile($realFile);
        }

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
