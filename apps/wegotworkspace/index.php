<?php

declare(strict_types=1);

/**
 * WeGotWorkspace front controller.
 * REST `/api/v1/*` is served by the greenfield Laravel app in `packages/api`.
 */

$appRoot = __DIR__;
if (! is_string(getenv('WGW_APP_ROOT')) || trim((string) getenv('WGW_APP_ROOT')) === '') {
    putenv('WGW_APP_ROOT='.$appRoot);
    $_ENV['WGW_APP_ROOT'] = $appRoot;
}

$buildDir = getenv('SABRE_BUILD_DIR');
if (is_string($buildDir) && trim($buildDir) !== '') {
    $buildDir = trim(str_replace('\\', '/', $buildDir));
    if ($buildDir[0] === '/') {
        $runtimeRoot = rtrim($buildDir, '/');
    } else {
        if (str_contains($buildDir, '..')) {
            header('Content-Type: text/plain; charset=utf-8');
            http_response_code(500);
            echo "Invalid SABRE_BUILD_DIR (must not contain '..').\n";
            exit;
        }
        $runtimeRoot = rtrim($appRoot, '/').'/'.ltrim($buildDir, '/');
    }
} else {
    $runtimeRoot = $appRoot;
}

$path = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/';

header_remove('X-Powered-By');
header('X-Content-Type-Options: nosniff');
header('X-Frame-Options: SAMEORIGIN');
header('Referrer-Policy: strict-origin-when-cross-origin');

$isApiRequest = $path === '/api' || str_starts_with($path, '/api/');

if ($isApiRequest) {
    $apiPackageRoot = null;
    foreach ([
        $runtimeRoot.'/packages/api',
        $appRoot.'/packages/api',
        dirname($appRoot, 2).'/packages/api',
    ] as $candidate) {
        if (is_file($candidate.'/public/index.php')) {
            $apiPackageRoot = $candidate;
            break;
        }
    }

    if ($apiPackageRoot === null) {
        header('Content-Type: application/json; charset=utf-8');
        http_response_code(503);
        echo json_encode([
            'error' => 'api_unavailable',
            'message' => 'packages/api Laravel runtime is missing.',
        ], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
        exit;
    }

    if (! is_file($apiPackageRoot.'/vendor/autoload.php')) {
        header('Content-Type: application/json; charset=utf-8');
        http_response_code(503);
        echo json_encode([
            'error' => 'api_unavailable',
            'message' => 'Run composer --working-dir packages/api install',
        ], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
        exit;
    }

    require $apiPackageRoot.'/public/index.php';
    exit;
}

header('Content-Type: text/html; charset=utf-8');
http_response_code(503);
echo '<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><title>WeGotWorkspace</title></head><body>';
echo '<h1>Application shell unavailable</h1>';
echo '<p>UI and installer runtimes are not bundled in this greenfield branch yet.</p>';
echo '<p>REST API: <code>/api/v1/health</code> (Laravel in <code>packages/api</code>).</p>';
echo '</body></html>';
