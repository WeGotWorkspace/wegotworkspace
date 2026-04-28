<?php

declare(strict_types=1);

namespace App\Home;

use App\Installer\WebBase;
use App\Paths;

final class HomeStatic
{
    public static function distRoot(): string
    {
        return Paths::homeDist();
    }

    public static function distReady(): bool
    {
        return is_file(self::distRoot().'/index.html');
    }

    public static function isHomePath(string $webBase, string $path): bool
    {
        $root = WebBase::url($webBase, '/');
        $assetPrefix = WebBase::url($webBase, '/home-assets');

        if ($path === $root) {
            return true;
        }
        if ($webBase !== '' && ($path === $webBase || $path === $webBase.'/')) {
            return true;
        }

        return $path === $assetPrefix || str_starts_with($path, $assetPrefix.'/');
    }

    /**
     * @param array{
     *   title:string,
     *   realm:string,
     *   username:string,
     *   isAdmin:bool,
     *   apps: array{
     *     admin:string,
     *     settings:string,
     *     drive:string,
     *     mail:string,
     *     voice:string,
     *     notes:string,
     *     office:string,
     *     officeDoc:string,
     *     officeSheet:string,
     *     officeSlides:string
     *   },
     *   logoutUrl:string,
     *   availability: array{
     *     filesEnabled:bool,
     *     drive:bool,
     *     mail:bool,
     *     voice:bool,
     *     notes:bool,
     *     office:bool
     *   }
     * } $config
     */
    public static function tryServe(string $webBase, string $path, array $config): bool
    {
        if (!self::isHomePath($webBase, $path)) {
            return false;
        }

        $root = self::distRoot();
        $rel = self::relativePath($webBase, $path);
        if ($rel === null) {
            return false;
        }

        if ($rel !== '' && (str_contains($rel, "\0") || str_contains($rel, '..'))) {
            self::respond404();

            return true;
        }

        $fs = $rel === '' ? $root.'/index.html' : $root.'/'.$rel;
        if (!is_file($fs)) {
            if (str_starts_with($rel, 'home-assets/')) {
                self::respond404();

                return true;
            }

            return false;
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
            default => 'application/octet-stream',
        };

        header('Content-Type: '.$mime);
        if ($ext === 'html' || $ext === 'htm') {
            header('Cache-Control: no-store, no-cache, must-revalidate');
            $html = (string) file_get_contents($realFile);
            if (basename($realFile) === 'index.html') {
                $json = json_encode(
                    $config,
                    JSON_THROW_ON_ERROR | JSON_HEX_TAG | JSON_HEX_APOS | JSON_HEX_AMP | JSON_HEX_QUOT | JSON_UNESCAPED_SLASHES
                );
                $inject = '<base href="'.htmlspecialchars(WebBase::url($webBase, '/'), ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8').'">'
                    ."\n".'<script>window.__SABRE_HOME_CONFIG__='.$json.';</script>';
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

    private static function relativePath(string $webBase, string $path): ?string
    {
        $assetPrefix = WebBase::url($webBase, '/home-assets');
        if ($path === $assetPrefix) {
            return 'home-assets';
        }
        if (str_starts_with($path, $assetPrefix.'/')) {
            $assetRel = ltrim(substr($path, strlen($assetPrefix) + 1), '/');

            return $assetRel === '' ? 'home-assets' : 'home-assets/'.$assetRel;
        }
        if (self::isRootPath($webBase, $path)) {
            return '';
        }

        return null;
    }

    private static function isRootPath(string $webBase, string $path): bool
    {
        $root = WebBase::url($webBase, '/');
        if ($path === $root) {
            return true;
        }
        if ($webBase !== '' && ($path === $webBase || $path === $webBase.'/')) {
            return true;
        }

        return false;
    }

    private static function respond404(): void
    {
        http_response_code(404);
        header('Content-Type: text/plain; charset=utf-8');
        echo 'Not found';
    }
}
