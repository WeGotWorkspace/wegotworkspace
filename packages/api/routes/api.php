<?php

declare(strict_types=1);

use App\Http\Controllers\Api\V1\Auth\JwksController;
use App\Http\Controllers\Api\V1\Auth\MeController;
use App\Http\Controllers\Api\V1\Auth\RefreshController;
use App\Http\Controllers\Api\V1\Auth\RevokeController;
use App\Http\Controllers\Api\V1\Auth\TokenController;
use App\Http\Controllers\Api\V1\Settings\MailController as SettingsMailController;
use App\Http\Controllers\Api\V1\Settings\ProfileController as SettingsProfileController;
use App\Http\Controllers\Api\V1\Settings\StateController as SettingsStateController;
use App\Http\Controllers\Api\V1\Notes\CapabilitiesController as NotesCapabilitiesController;
use App\Http\Controllers\Api\V1\Notes\ItemsController as NotesItemsController;
use App\Http\Controllers\Api\V1\Notes\NotebooksController;
use App\Http\Controllers\Api\V1\Notes\StateController as NotesStateController;
use App\Http\Controllers\Api\V1\System\CapabilitiesController;
use App\Http\Controllers\Api\V1\System\HealthController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Greenfield REST API (OpenAPI: packages/api/openapi/openapi.json)
|--------------------------------------------------------------------------
*/

Route::get('health', HealthController::class);
Route::get('capabilities', CapabilitiesController::class);

Route::get('.well-known/jwks.json', JwksController::class);

Route::post('auth/token', TokenController::class);
Route::post('auth/refresh', RefreshController::class);
Route::post('auth/revoke', RevokeController::class);

Route::middleware(['wgw.auth', 'wgw.role:user'])->group(function (): void {
    Route::get('me', MeController::class);
    Route::get('settings/state', SettingsStateController::class);
    Route::put('settings/profile', SettingsProfileController::class);
    Route::put('settings/mail', SettingsMailController::class);

    Route::get('notes/capabilities', NotesCapabilitiesController::class);
    Route::get('notes/state', NotesStateController::class);
    Route::get('notes/items', [NotesItemsController::class, 'index']);
    Route::post('notes/items', [NotesItemsController::class, 'store']);
    Route::put('notes/items/{id}', [NotesItemsController::class, 'update']);
    Route::delete('notes/items/{id}', [NotesItemsController::class, 'destroy']);
    Route::post('notes/items/{id}/archive', [NotesItemsController::class, 'archive']);
    Route::post('notes/items/{id}/restore', [NotesItemsController::class, 'restore']);
    Route::get('notes/notebooks', [NotebooksController::class, 'index']);
    Route::post('notes/notebooks', [NotebooksController::class, 'store']);
    Route::patch('notes/notebooks/{name}', [NotebooksController::class, 'update']);
    Route::delete('notes/notebooks/{name}', [NotebooksController::class, 'destroy']);
});
