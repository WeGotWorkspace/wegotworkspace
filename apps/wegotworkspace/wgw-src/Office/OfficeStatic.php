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

        $ext = strtolower(pathinfo($realFile, PATHINFO_EXTENSION));
        $mime = match ($ext) {
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
        header('Content-Type: '.$mime);
        // Next static export may ship x2t.wasm as Brotli-compressed bytes (see packages/openoffice-web/next.config
        // headers for /x2t/x2t.wasm). Browsers only decompress when Content-Encoding: br is set; otherwise
        // WebAssembly.instantiate sees wrong magic (expects \0asm).
        if ($ext === 'wasm' && self::wasmOnDiskIsBrotliCompressed($realFile)) {
            header('Content-Encoding: br');
        }
        if (in_array($ext, ['html', 'htm', 'js', 'mjs', 'css', 'json', 'map'], true)) {
            header('Cache-Control: no-store, no-cache, must-revalidate');
        } else {
            header('Cache-Control: public, max-age=86400');
        }
        readfile($realFile);

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

        // Compatibility aliases: keep /office/apps/* and /office/sdkjs/* working even though
        // we only store a single versioned bundle tree in build/<version>/...
        $bundleVersion = self::detectBundleVersion($root);
        if ($bundleVersion !== null) {
            if (str_starts_with($rel, 'apps/')) {
                $rel = $bundleVersion.'/web-apps/'.$rel;
            } elseif (str_starts_with($rel, 'sdkjs/')) {
                $rel = $bundleVersion.'/'.$rel;
            }
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

    private static function detectBundleVersion(string $root): ?string
    {
        $entries = @scandir($root);
        if (!is_array($entries)) {
            return null;
        }

        foreach ($entries as $entry) {
            if ($entry === '.' || $entry === '..') {
                continue;
            }
            $candidate = $root.'/'.$entry;
            if (!is_dir($candidate)) {
                continue;
            }
            if (is_dir($candidate.'/web-apps')) {
                return $entry;
            }
        }

        return null;
    }

    /**
     * True when {@code .wasm} on disk is not raw WebAssembly (first four bytes must be {@code \\0asm}).
     * The OpenOffice Web export stores Brotli-compressed wasm under the {@code .wasm} name.
     */
    private static function wasmOnDiskIsBrotliCompressed(string $path): bool
    {
        $h = @file_get_contents($path, false, null, 0, 4);

        return $h !== false
            && strlen($h) === 4
            && $h !== "\0asm";
    }
}
