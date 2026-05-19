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

Route::match($wgwFrontMethods, '/{path?}', WgwFrontController::class)
    ->where('path', '(?!api(?:/|$)).*')
    ->name('wgw.front');
