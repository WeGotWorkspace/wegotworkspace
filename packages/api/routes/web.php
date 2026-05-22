<?php

declare(strict_types=1);

use App\Http\Controllers\Front\WgwFrontController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| UI shells + WebDAV (non-JSON front door)
|--------------------------------------------------------------------------
|
| All browser and WebDAV traffic is handled by Laravel. REST stays on
| routes/api.php (prefix api/v1).
|
*/

/** @var list<string> */
$wgwFrontMethods = [
    'GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS',
    'PROPFIND', 'PROPPATCH', 'MKCOL', 'COPY', 'MOVE', 'LOCK', 'UNLOCK', 'REPORT', 'SEARCH',
];

// When Apache serves Laravel via Alias /api → public/index.php, PATH_INFO is relative
// to that script (e.g. /v1/health), not /api/v1/health — exclude versioned API segments too.
Route::match($wgwFrontMethods, '/{path?}', WgwFrontController::class)
    ->where('path', '(?!api(?:/|$)|v\d+(?:/|$)).*')
    ->name('wgw.front');
