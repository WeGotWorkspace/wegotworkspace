<?php

declare(strict_types=1);

use App\Http\Controllers\Api\V1\Auth\JwksController;
use App\Http\Controllers\Api\V1\Auth\MeController;
use App\Http\Controllers\Api\V1\Auth\RefreshController;
use App\Http\Controllers\Api\V1\Auth\RevokeController;
use App\Http\Controllers\Api\V1\Auth\TokenController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Greenfield REST API (OpenAPI: packages/api/openapi/openapi.json)
|--------------------------------------------------------------------------
*/

Route::get('.well-known/jwks.json', JwksController::class);

Route::post('auth/token', TokenController::class);
Route::post('auth/refresh', RefreshController::class);
Route::post('auth/revoke', RevokeController::class);

Route::middleware('wgw.auth')->group(function (): void {
    Route::get('me', MeController::class);
});
