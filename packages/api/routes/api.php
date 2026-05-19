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
use App\Http\Controllers\Api\V1\Drive\DriveController;
use App\Http\Controllers\Api\V1\Office\CapabilitiesController as OfficeCapabilitiesController;
use App\Http\Controllers\Api\V1\Office\DocumentsController as OfficeDocumentsController;
use App\Http\Controllers\Api\V1\Office\SessionController as OfficeSessionController;
use App\Http\Controllers\Api\V1\Dav\CapabilitiesController as DavCapabilitiesController;
use App\Http\Controllers\Api\V1\Home\StateController as HomeStateController;
use App\Http\Controllers\Api\V1\Installer\ActionController as InstallerActionController;
use App\Http\Controllers\Api\V1\Installer\BootstrapController as InstallerBootstrapController;
use App\Http\Controllers\Api\V1\Installer\StateController as InstallerStateController;
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

Route::middleware([
    \Illuminate\Cookie\Middleware\EncryptCookies::class,
    \Illuminate\Cookie\Middleware\AddQueuedCookiesToResponse::class,
    \Illuminate\Session\Middleware\StartSession::class,
])->group(function (): void {
    Route::get('installer/state', InstallerStateController::class);
    Route::get('installer/bootstrap', InstallerBootstrapController::class);
    Route::post('installer/action', InstallerActionController::class);
});

$driveSession = [
    \Illuminate\Cookie\Middleware\EncryptCookies::class,
    \Illuminate\Cookie\Middleware\AddQueuedCookiesToResponse::class,
    \Illuminate\Session\Middleware\StartSession::class,
];

Route::middleware(['wgw.auth', 'wgw.role:user'])->group(function () use ($driveSession): void {
    Route::get('me', MeController::class);
    Route::get('home/state', HomeStateController::class);
    Route::get('dav/capabilities', DavCapabilitiesController::class);

    Route::middleware($driveSession)->group(function (): void {
        Route::get('drive/user', [DriveController::class, 'user']);
        Route::post('drive/getdir', [DriveController::class, 'getDir']);
        Route::post('drive/searchfiles', [DriveController::class, 'searchFiles']);
        Route::post('drive/changedir', [DriveController::class, 'changeDir']);
        Route::post('drive/createnew', [DriveController::class, 'createNew']);
        Route::post('drive/renameitem', [DriveController::class, 'renameItem']);
        Route::post('drive/deleteitems', [DriveController::class, 'deleteItems']);
        Route::get('drive/download', [DriveController::class, 'download']);
        Route::get('drive/upload', [DriveController::class, 'uploadProbe']);
        Route::post('drive/upload', [DriveController::class, 'upload']);
        Route::get('drive/stars', [DriveController::class, 'starsIndex']);
        Route::post('drive/stars', [DriveController::class, 'starsUpdate']);
    });

    Route::get('office/capabilities', OfficeCapabilitiesController::class);
    Route::post('office/session', OfficeSessionController::class);
    Route::post('office/documents', [OfficeDocumentsController::class, 'store']);
    Route::put('office/documents', [OfficeDocumentsController::class, 'update']);
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
