<?php

declare(strict_types=1);

/**
 * WeGotWorkspace front controller — all HTTP enters the Laravel app in packages/api.
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

$apiCandidates = [
    $runtimeRoot.'/packages/api',
    $appRoot.'/packages/api',
    dirname($appRoot, 2).'/packages/api',
];

$apiPackageRoot = null;
$apiPackageWithoutVendor = null;
foreach ($apiCandidates as $candidate) {
    if (! is_file($candidate.'/public/index.php')) {
        continue;
    }
    if (is_file($candidate.'/vendor/autoload.php')) {
        $apiPackageRoot = $candidate;
        break;
    }
    if ($apiPackageWithoutVendor === null) {
        $apiPackageWithoutVendor = $candidate;
    }
}

if ($apiPackageRoot === null) {
    header('Content-Type: application/json; charset=utf-8');
    http_response_code(503);
    if ($apiPackageWithoutVendor !== null) {
        echo json_encode([
            'error' => 'api_unavailable',
            'message' => 'Composer vendor/ is missing for the API package. Run `composer --working-dir packages/api install` from the repo root (monorepo dev), or `pnpm --filter @wgw/api build` to sync a runtime copy with vendor.',
            'path' => $apiPackageWithoutVendor,
        ], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    } else {
        echo json_encode([
            'error' => 'api_unavailable',
            'message' => 'packages/api Laravel runtime is missing.',
        ], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    }
    exit;
}

require $apiPackageRoot.'/public/index.php';
