<?php

declare(strict_types=1);

/**
 * Resolve runtime root from optional SABRE_BUILD_DIR.
 */
$appRoot = __DIR__;
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

$vendorCandidates = [
    $runtimeRoot.'/vendor/autoload.php',
    $appRoot.'/vendor/autoload.php',
];
$autoload = null;
foreach ($vendorCandidates as $candidate) {
    if (is_readable($candidate)) {
        $autoload = $candidate;
        break;
    }
}
if ($autoload === null) {
    header('Content-Type: text/plain; charset=utf-8');
    http_response_code(503);
    echo "Composer dependencies are missing. Run `composer --working-dir apps/wegotworkspace install` (and optionally set COMPOSER_VENDOR_DIR for custom runtime layouts).\n";
    exit;
}

require $autoload;

/**
 * Composer keeps loading third-party dependencies; this loader resolves only our own App classes.
 */
spl_autoload_register(static function (string $class) use ($runtimeRoot, $appRoot): void {
    $prefix = 'App\\';
    if (!str_starts_with($class, $prefix)) {
        return;
    }
    $relative = str_replace('\\', '/', substr($class, strlen($prefix)));
    if ($relative === false || $relative === '') {
        return;
    }
    $candidates = [
        $runtimeRoot.'/wgw-src/'.$relative.'.php',
        $appRoot.'/wgw-src/'.$relative.'.php',
        // Legacy layout fallback.
        $runtimeRoot.'/src/'.$relative.'.php',
        $appRoot.'/src/'.$relative.'.php',
    ];
    foreach ($candidates as $path) {
        if (is_readable($path)) {
            require $path;

            return;
        }
    }
}, true, true);

use App\Admin\AdminUiKernel;
use App\Api\ApiKernel;
use App\Auth\UiLoginKernel;
use App\Config;
use App\Drive\DriveKernel;
use App\Installer\InstallerKernel;
use App\Installer\WebBase;
use App\Paths;
use App\Server\SabreApp;
use App\Home\HomeKernel;
use App\Mail\MailKernel;
use App\Notes\NotesKernel;
use App\Office\OfficeEntry;
use App\Office\OfficeStatic;
use App\Pwa\PwaSupport;
use App\Security\TrustedHostGate;
use App\Voice\VoiceKernel;
use App\UserSettings\UserSettingsUiKernel;
use App\Update\UpdateManager;

$https = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off')
    || (isset($_SERVER['HTTP_X_FORWARDED_PROTO']) && $_SERVER['HTTP_X_FORWARDED_PROTO'] === 'https');
$webBase = WebBase::detect();
$path = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/';

if (!TrustedHostGate::isAllowed($_SERVER, getenv('WGW_TRUSTED_HOSTS'))) {
    http_response_code(400);
    header('Content-Type: text/plain; charset=utf-8');
    echo "Bad Request\n";
    exit;
}

header_remove('X-Powered-By');
header('X-Content-Type-Options: nosniff');
header('X-Frame-Options: SAMEORIGIN');
header('Referrer-Policy: strict-origin-when-cross-origin');
$officePrefix = WebBase::url($webBase, '/office');
$isOfficeRequest = $path === $officePrefix || str_starts_with($path, $officePrefix.'/');
$scriptSrc = "'self' 'unsafe-inline'";
$styleSrc = "'self' 'unsafe-inline' https://fonts.googleapis.com";
$fontSrc = "'self' data: https://fonts.gstatic.com";
$connectSrc = "'self' https: wss:";
$apiDocsPrefix = WebBase::url($webBase, '/api/docs');
$isApiDocsRequest = $path === $apiDocsPrefix || $path === $apiDocsPrefix.'/' || str_starts_with($path, $apiDocsPrefix.'/');
if ($isOfficeRequest) {
    // ONLYOFFICE web-apps uses dynamic template evaluation and blob workers in editor runtime.
    $scriptSrc .= " 'unsafe-eval' blob:";
    $connectSrc .= " blob:";
}
header(
    "Content-Security-Policy: default-src 'self'; base-uri 'self'; object-src 'none'; "
    ."frame-ancestors 'self'; script-src ".$scriptSrc."; style-src ".$styleSrc."; font-src ".$fontSrc."; "
    ."img-src 'self' data: blob: https:; connect-src ".$connectSrc."; worker-src 'self' blob:"
);
if ($https) {
    header('Strict-Transport-Security: max-age=31536000; includeSubDomains');
}

$installPrefix = WebBase::url($webBase, '/install');
$adminApiUpdatesPrefix = WebBase::url($webBase, '/admin/api/updates');

if (PwaSupport::tryRespond($webBase, $path)) {
    exit;
}

$installed = is_file(Paths::lockFile());

if ($installed && UpdateManager::inMaintenanceMode()) {
    $allowUpdateApi = $path === $adminApiUpdatesPrefix || str_starts_with($path, $adminApiUpdatesPrefix.'/');
    if (!$allowUpdateApi) {
        http_response_code(503);
        header('Content-Type: text/html; charset=utf-8');
        header('Retry-After: 120');
        echo '<!DOCTYPE html><html><head><meta charset="utf-8"><title>Maintenance</title></head><body>';
        echo '<h1>WeGotWorkspace is updating</h1>';
        echo '<p>The update process is currently running. Please refresh this page in a minute.</p>';
        echo '</body></html>';
        exit;
    }
}

if (!$installed) {
    $underInstall = $path === $installPrefix || str_starts_with($path, $installPrefix.'/');
    if (!$underInstall) {
        header('Location: '.$installPrefix.'/', true, 302);
        exit;
    }
    InstallerKernel::respond();
    exit;
}

$underInstall = $path === $installPrefix || str_starts_with($path, $installPrefix.'/');
if ($underInstall) {
    InstallerKernel::respond();
    exit;
}

$adminPrefix = WebBase::url($webBase, '/admin');
if ($path === $adminPrefix || str_starts_with($path, $adminPrefix.'/')) {
    AdminUiKernel::tryRespond($webBase, $path);
    exit;
}

$settingsPrefix = WebBase::url($webBase, '/settings');
if ($path === $settingsPrefix || str_starts_with($path, $settingsPrefix.'/')) {
    UserSettingsUiKernel::tryRespond($webBase, $path);
    exit;
}

if (UiLoginKernel::tryRespond($webBase, $path)) {
    exit;
}

if (ApiKernel::tryRespond($webBase, $path)) {
    exit;
}

$legacySheets = WebBase::url($webBase, '/sheets');
if ($path === $legacySheets || str_starts_with($path, $legacySheets.'/')) {
    header('Location: '.WebBase::url($webBase, '/office/'), true, 301);
    exit;
}

$legacyDocs = WebBase::url($webBase, '/docs');
if ($path === $legacyDocs || str_starts_with($path, $legacyDocs.'/')) {
    header('Location: '.WebBase::url($webBase, '/office/'), true, 301);
    exit;
}

if (OfficeEntry::tryRespondInjectedHtml($webBase, $path)) {
    exit;
}

if (OfficeStatic::tryServe($webBase, $path)) {
    exit;
}

// Legacy “Talk” URLs (/talk/…) → /voice/… (308; preserves method for signaling POSTs and bookmarks).
$legacyTalk = WebBase::url($webBase, '/talk');
if ($path === $legacyTalk || $path === $legacyTalk.'/' || str_starts_with($path, $legacyTalk.'/')) {
    $suffix = substr($path, strlen($legacyTalk));
    if ($suffix === '') {
        $suffix = '/';
    }
    $targetPath = WebBase::url($webBase, '/voice'.$suffix);
    $qs = isset($_SERVER['QUERY_STRING']) && is_string($_SERVER['QUERY_STRING']) && $_SERVER['QUERY_STRING'] !== ''
        ? '?'.$_SERVER['QUERY_STRING']
        : '';
    header('Location: '.$targetPath.$qs, true, 308);
    exit;
}

if (VoiceKernel::tryRespond($webBase, $path)) {
    exit;
}

if (MailKernel::tryRespond($webBase, $path)) {
    exit;
}

if (NotesKernel::tryRespond($webBase, $path)) {
    exit;
}

if (DriveKernel::tryRespond($webBase, $path)) {
    exit;
}

if (HomeKernel::tryRespond($webBase, $path)) {
    exit;
}

// RFC 6764: Calendar / Contacts "automatic" setup probes /.well-known/caldav and /.well-known/carddav.
if (preg_match('#/\\.well-known/(caldav|carddav)/?$#', $path, $wk)) {
    $cfg = Config::load();
    if (($wk[1] ?? '') === 'caldav' && !($cfg['calendar_enabled'] ?? true)) {
        http_response_code(404);
        header('Content-Type: text/plain; charset=utf-8');
        exit;
    }
    if (($wk[1] ?? '') === 'carddav' && !($cfg['contacts_enabled'] ?? true)) {
        http_response_code(404);
        header('Content-Type: text/plain; charset=utf-8');
        exit;
    }
    $basePath = (string) ($cfg['base_uri'] ?? '/');
    if ($basePath === '' || $basePath[0] !== '/') {
        $basePath = '/'.$basePath;
    }
    $basePath = rtrim($basePath, '/').'/';
    header('Location: '.$basePath, true, 307);
    exit;
}

SabreApp::run();
