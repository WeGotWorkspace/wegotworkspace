<?php

declare(strict_types=1);

/**
 * Contract-only reset: packages/api no longer ships a PHP runtime.
 * UI bundles under packages/apps/*/dist may still be built; API and installer
 * routes return 503 until Laravel is scaffolded per packages/api/docs/greenfield-plan.md.
 */

header_remove('X-Powered-By');
header('X-Content-Type-Options: nosniff');
header('X-Frame-Options: SAMEORIGIN');
header('Referrer-Policy: strict-origin-when-cross-origin');

$path = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/';
$method = strtoupper((string) ($_SERVER['REQUEST_METHOD'] ?? 'GET'));

$isApi = str_starts_with($path, '/api/v1') || str_starts_with($path, '/api/');
$isInstall = $path === '/install' || str_starts_with($path, '/install/');
$isDav = preg_match('#^/(?:\.well-known/(?:caldav|carddav)|principals/|calendars/|addressbooks/)#', $path) === 1;

if ($isApi) {
    header('Content-Type: application/json; charset=utf-8');
    http_response_code(503);
    echo json_encode([
        'error' => 'api_unavailable',
        'message' => 'REST API runtime removed for greenfield rebuild. Contract: packages/api/openapi/openapi.json',
    ], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    exit;
}

if ($isInstall || $isDav || in_array($path, ['/mail', '/notes', '/drive', '/home', '/voice', '/office'], true)
    || str_starts_with($path, '/mail/')
    || str_starts_with($path, '/notes/')
    || str_starts_with($path, '/drive/')
    || str_starts_with($path, '/home/')
    || str_starts_with($path, '/voice/')
    || str_starts_with($path, '/office/')
) {
    header('Content-Type: text/html; charset=utf-8');
    http_response_code(503);
    echo '<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><title>WeGotWorkspace</title></head><body>';
    echo '<h1>Backend not available</h1>';
    echo '<p>The PHP runtime was removed from <code>packages/api</code> for a greenfield Laravel rebuild.</p>';
    echo '<p>See <code>packages/api/docs/greenfield-plan.md</code> and <code>packages/api/openapi/openapi.json</code>.</p>';
    echo '</body></html>';
    exit;
}

// Allow direct static file hits when using php -S (built UI assets under packages/apps/*/dist).
$appRoot = __DIR__;
$relative = ltrim($path, '/');
if ($relative !== '' && $method === 'GET') {
    $candidate = $appRoot.'/'.$relative;
    if (is_file($candidate) && !str_contains($relative, '..')) {
        return false;
    }
}

header('Content-Type: text/html; charset=utf-8');
http_response_code(503);
echo '<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><title>WeGotWorkspace</title></head><body>';
echo '<h1>WeGotWorkspace</h1>';
echo '<p>Application shell is unavailable until the API is reimplemented. Build UI with <code>pnpm run build</code>; implement API per <code>packages/api/docs/greenfield-plan.md</code>.</p>';
echo '</body></html>';
