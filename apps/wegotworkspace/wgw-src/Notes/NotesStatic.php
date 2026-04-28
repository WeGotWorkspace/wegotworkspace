<?php

declare(strict_types=1);

namespace App\Notes;

use App\Installer\WebBase;
use App\Paths;

final class NotesStatic
{
    public static function distRoot(): string
    {
        return Paths::notesDist();
    }

    public static function distReady(): bool
    {
        return is_file(self::distRoot().'/index.html');
    }

    /**
     * @param array{base_uri:string,username:string,display_name:string,logout_url:string} $config
     */
    public static function tryServe(string $webBase, string $path, array $config): bool
    {
        $prefix = WebBase::url($webBase, '/notes');
        if ($path !== $prefix && !str_starts_with($path, $prefix.'/')) {
            return false;
        }

        $root = self::distRoot();
        $rel = $path === $prefix || $path === $prefix.'/' ? '' : substr($path, strlen($prefix) + 1);
        $rel = str_replace('\\', '/', (string) $rel);
        $rel = rawurldecode($rel);
        if ($rel !== '' && str_contains($rel, "\0")) {
            self::respond404();

            return true;
        }
        if (str_contains($rel, '..')) {
            self::respond404();

            return true;
        }

        $fs = self::mapUrlToFilesystem($root, $rel);
        if ($fs === null) {
            if ($rel !== '' && preg_match('#^(css|js|img|fonts|assets)/#', $rel) === 1) {
                self::respond404();

                return true;
            }
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
            self::respond404();

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
            'gif' => 'image/gif',
            'woff' => 'font/woff',
            'woff2' => 'font/woff2',
            'ttf' => 'font/ttf',
            'otf' => 'font/otf',
            'txt' => 'text/plain; charset=utf-8',
            'xml' => 'application/xml; charset=utf-8',
            'map' => 'application/json; charset=utf-8',
            default => 'application/octet-stream',
        };
        header('Content-Type: '.$mime);
        if ($ext === 'html' || $ext === 'htm') {
            header('Cache-Control: no-store, no-cache, must-revalidate');
            $html = (string) file_get_contents($realFile);
            if (basename($realFile) === 'index.html') {
                $payload = [
                    'baseUri' => $config['base_uri'],
                    'username' => $config['username'],
                    'displayName' => $config['display_name'],
                    'logoutUrl' => $config['logout_url'],
                    'notesPath' => WebBase::url($webBase, '/notes/'),
                ];
                $json = json_encode(
                    $payload,
                    JSON_THROW_ON_ERROR | JSON_HEX_TAG | JSON_HEX_APOS | JSON_HEX_AMP | JSON_HEX_QUOT | JSON_UNESCAPED_SLASHES
                );
                $inject = '<base href="'.htmlspecialchars(WebBase::url($webBase, '/notes/'), ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8').'">'
                    ."\n".'<script>window.__SABRE_NOTES_CONFIG__='.$json.';</script>';
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

    private static function respond404(): void
    {
        http_response_code(404);
        header('Content-Type: text/plain; charset=utf-8');
        echo 'Not found';
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
