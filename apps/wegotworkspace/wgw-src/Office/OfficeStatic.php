<?php

declare(strict_types=1);

namespace App\Office;

use App\Installer\WebBase;
use App\Paths;

/**
 * Serves the Next static export from {@see Paths::officeUiBuild} at URL prefix {@code /office/}.
 */
final class OfficeStatic
{
    private const DEFAULT_UPSTREAM = 'https://office-editor.ziziyi.com';

    public static function tryServe(string $webBase, string $path): bool
    {
        $prefix = WebBase::url($webBase, '/office');
        if ($path !== $prefix && !str_starts_with($path, $prefix.'/')) {
            return false;
        }

        if (OfficeEntry::isInjectedHtmlPath($webBase, $path)) {
            return false;
        }

        $root = Paths::officeUiBuild();
        $rel = $path === $prefix || $path === $prefix.'/' ? '' : substr($path, strlen($prefix) + 1);
        $rel = str_replace('\\', '/', (string) $rel);
        // Browsers send spaces as %20; mapUrlToFilesystem must match on-disk names (e.g. template previews).
        $rel = rawurldecode($rel);
        if ($rel !== '' && str_contains($rel, "\0")) {
            http_response_code(404);
            header('Content-Type: text/plain; charset=utf-8');
            echo 'Not found';

            return true;
        }
        if (str_contains($rel, '..')) {
            http_response_code(404);
            header('Content-Type: text/plain; charset=utf-8');
            echo 'Not found';

            return true;
        }

        $fs = self::mapUrlToFilesystem($root, $rel);
        if ($fs === null) {
            // Some Office runtime assets are versioned and occasionally absent locally.
            // Fallback to upstream mirror while preserving same-origin responses.
            if (self::tryProxyFromUpstream($rel)) {
                return true;
            }
            http_response_code(404);
            header('Content-Type: text/plain; charset=utf-8');
            echo 'Not found';

            return true;
        }

        $realRoot = realpath($root);
        $realFile = is_readable($fs) ? realpath($fs) : false;
        if ($realRoot === false || $realFile === false || !str_starts_with($realFile, $realRoot)) {
            http_response_code(404);
            header('Content-Type: text/plain; charset=utf-8');
            echo 'Not found';

            return true;
        }

        self::sendLocalFile($realFile);

        return true;
    }

    /**
     * Compatibility aliases for absolute SDKJS / web-apps paths emitted by some ONLYOFFICE templates.
     * Maps {@code /sdkjs/...} to {@code /office/<bundle>/sdkjs/...} and serves it directly.
     */
    public static function tryServeLegacyAlias(string $path): bool
    {
        if (!str_starts_with($path, '/sdkjs/')) {
            return false;
        }

        $bundleVersion = self::detectBundleVersion(Paths::officeUiBuild());
        if ($bundleVersion === null) {
            return false;
        }

        $root = Paths::officeUiBuild();
        $rel = $bundleVersion.'/'.ltrim($path, '/');
        $fs = self::mapUrlToFilesystem($root, $rel);
        if ($fs === null) {
            if (self::tryProxyFromUpstream($rel)) {
                return true;
            }
            http_response_code(404);
            header('Content-Type: text/plain; charset=utf-8');
            echo 'Not found';

            return true;
        }

        $realRoot = realpath($root);
        $realFile = is_readable($fs) ? realpath($fs) : false;
        if ($realRoot === false || $realFile === false || !str_starts_with($realFile, $realRoot)) {
            http_response_code(404);
            header('Content-Type: text/plain; charset=utf-8');
            echo 'Not found';

            return true;
        }

        self::sendLocalFile($realFile);

        return true;
    }

    /**
     * Map URL path after {@code /office} to a file under the export root (Next “flat” static export).
     */
    private static function mapUrlToFilesystem(string $root, string $rel): ?string
    {
        $rel = ltrim($rel, '/');
        if ($rel === '' || $rel === 'index.html') {
            return $root.'/index.html';
        }

        $direct = $root.'/'.$rel;
        if (is_file($direct)) {
            return $direct;
        }

        $asHtml = $root.'/'.$rel.'.html';
        if (is_file($asHtml)) {
            return $asHtml;
        }

        $indexUnder = $root.'/'.$rel.'/index.html';
        if (is_file($indexUnder)) {
            return $indexUnder;
        }

        return null;
    }

    private static function sendLocalFile(string $realFile): void
    {
        $ext = strtolower(pathinfo($realFile, PATHINFO_EXTENSION));
        $mime = self::mimeTypeForExtension($ext);
        header('Content-Type: '.$mime);
        if ($ext === 'wasm' && self::wasmOnDiskIsBrotliCompressed($realFile)) {
            header('Content-Encoding: br');
        }
        header('Cache-Control: '.self::cacheControlForExtension($ext));
        readfile($realFile);
    }

    private static function tryProxyFromUpstream(string $rel): bool
    {
        $rel = ltrim($rel, '/');
        if ($rel === '') {
            return false;
        }

        $base = getenv('WGW_OFFICE_UPSTREAM');
        if (!is_string($base) || trim($base) === '') {
            $base = self::DEFAULT_UPSTREAM;
        }
        $base = rtrim(trim($base), '/');
        $url = $base.'/'.$rel;

        $ctx = stream_context_create([
            'http' => [
                'follow_location' => 1,
                'timeout' => 20,
                'ignore_errors' => true,
                'user_agent' => 'WeGotWorkspace/office-proxy',
            ],
            'https' => [
                'follow_location' => 1,
                'timeout' => 20,
            ],
        ]);
        $h = @fopen($url, 'rb', false, $ctx);
        if ($h === false) {
            return false;
        }

        $meta = stream_get_meta_data($h);
        /** @var array<int, string> $headers */
        $headers = is_array($meta['wrapper_data'] ?? null) ? $meta['wrapper_data'] : [];
        $status = 200;
        $contentType = null;
        $contentEncoding = null;
        foreach ($headers as $line) {
            if (preg_match('#^HTTP/\S+\s+(\d{3})#', $line, $m)) {
                $status = (int) $m[1];
                continue;
            }
            if (stripos($line, 'Content-Type:') === 0) {
                $contentType = trim(substr($line, 13));
                continue;
            }
            if (stripos($line, 'Content-Encoding:') === 0) {
                $contentEncoding = trim(substr($line, 17));
            }
        }

        if ($status < 200 || $status >= 300) {
            fclose($h);

            return false;
        }

        $ext = strtolower(pathinfo($rel, PATHINFO_EXTENSION));
        header('Content-Type: '.($contentType ?: self::mimeTypeForExtension($ext)));
        if ($contentEncoding !== null && $contentEncoding !== '') {
            header('Content-Encoding: '.$contentEncoding);
        }
        header('Cache-Control: '.self::cacheControlForExtension($ext));
        fpassthru($h);
        fclose($h);

        return true;
    }

    private static function detectBundleVersion(string $root): ?string
    {
        if (!is_dir($root)) {
            return null;
        }
        $entries = @scandir($root);
        if (!is_array($entries)) {
            return null;
        }
        foreach ($entries as $entry) {
            if ($entry === '.' || $entry === '..') {
                continue;
            }
            if (!preg_match('/^v\d+(\.\d+)*(-\d+)?$/', $entry)) {
                continue;
            }
            if (is_dir($root.'/'.$entry.'/web-apps')) {
                return $entry;
            }
        }

        return null;
    }

    private static function mimeTypeForExtension(string $ext): string
    {
        return match ($ext) {
            'js' => 'application/javascript; charset=utf-8',
            'mjs' => 'application/javascript; charset=utf-8',
            'css' => 'text/css; charset=utf-8',
            'html' => 'text/html; charset=utf-8',
            'htm' => 'text/html; charset=utf-8',
            'wasm' => 'application/wasm',
            'json' => 'application/json; charset=utf-8',
            'svg' => 'image/svg+xml',
            'png' => 'image/png',
            'jpg', 'jpeg' => 'image/jpeg',
            'webp' => 'image/webp',
            'ico' => 'image/x-icon',
            'woff' => 'font/woff',
            'woff2' => 'font/woff2',
            'ttf' => 'font/ttf',
            'otf' => 'font/otf',
            'txt' => 'text/plain; charset=utf-8',
            'xml' => 'application/xml; charset=utf-8',
            'map' => 'application/json; charset=utf-8',
            default => 'application/octet-stream',
        };
    }

    private static function cacheControlForExtension(string $ext): string
    {
        return match ($ext) {
            'js', 'mjs', 'css', 'json', 'html', 'htm', 'map' => 'no-store, no-cache, must-revalidate',
            default => 'public, max-age=86400',
        };
    }

    /**
     * True when {@code .wasm} on disk is not raw WebAssembly (first four bytes must be {@code \\0asm}).
     * The Next export stores Brotli-compressed wasm under the {@code .wasm} name.
     */
    private static function wasmOnDiskIsBrotliCompressed(string $path): bool
    {
        $h = @file_get_contents($path, false, null, 0, 4);

        return $h !== false
            && strlen($h) === 4
            && $h !== "\0asm";
    }
}
