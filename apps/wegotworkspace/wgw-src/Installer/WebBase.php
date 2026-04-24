<?php

declare(strict_types=1);

namespace App\Installer;

final class WebBase
{
    /**
     * Web path to the directory containing index.php (no trailing slash), e.g. "" or "/app".
     */
    public static function detect(): string
    {
        $script = $_SERVER['SCRIPT_NAME'] ?? '/index.php';
        $script = str_replace('\\', '/', (string) $script);
        // PHP's built-in server (`php -S … index.php`) may set SCRIPT_NAME to the requested
        // static asset path (e.g. *.js) instead of the router script; only index.php carries webBase.
        if (basename($script) !== 'index.php') {
            $script = '/index.php';
        }
        $dir = dirname($script);
        if ($dir === '/' || $dir === '.') {
            return '';
        }

        $dir = rtrim($dir, '/');
        $path = parse_url((string) ($_SERVER['REQUEST_URI'] ?? '/'), PHP_URL_PATH);
        $path = is_string($path) && $path !== '' ? str_replace('\\', '/', $path) : '/';
        // Apache often rewrites pretty URLs to {@code …/index.php} while {@code REQUEST_URI} stays
        // {@code /voice/…}. Using {@code $dir} then breaks {@code VoiceKernel}
        // matching and the request falls through to WebDAV → HTTP 401 on guest join links.
        if ($path !== $dir && !str_starts_with($path, $dir.'/')) {
            return '';
        }

        return $dir;
    }

    public static function baseUriFromWebBase(string $webBase): string
    {
        $webBase = trim(str_replace('\\', '/', $webBase), '/');

        return $webBase === '' ? '/' : '/'.$webBase.'/';
    }

    public static function url(string $webBase, string $path): string
    {
        $path = '/'.ltrim($path, '/');
        if ($webBase === '') {
            return $path;
        }

        return $webBase.$path;
    }
}
