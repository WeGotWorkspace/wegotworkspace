<?php

declare(strict_types=1);

use App\Http\Controllers\Api\V1\Admin\GroupMemberController as AdminGroupMemberController;
use App\Http\Controllers\Api\V1\Admin\GroupsController as AdminGroupsController;
use App\Http\Controllers\Api\V1\Admin\PluginInstallController as AdminPluginInstallController;
use App\Http\Controllers\Api\V1\Admin\SettingsController as AdminSettingsController;
use App\Http\Controllers\Api\V1\Admin\StateController as AdminStateController;
use App\Http\Controllers\Api\V1\Admin\UpdateApplyController as AdminUpdateApplyController;
use App\Http\Controllers\Api\V1\Admin\UpdateBackupController as AdminUpdateBackupController;
use App\Http\Controllers\Api\V1\Admin\UpdateCancelController as AdminUpdateCancelController;
use App\Http\Controllers\Api\V1\Admin\UpdateCheckController as AdminUpdateCheckController;
use App\Http\Controllers\Api\V1\Admin\UpdateLogController as AdminUpdateLogController;
use App\Http\Controllers\Api\V1\Admin\UpdateStateController as AdminUpdateStateController;
use App\Http\Controllers\Api\V1\Admin\UsersController as AdminUsersController;
use App\Http\Controllers\Api\V1\Auth\JwksController;
use App\Http\Controllers\Api\V1\Auth\MeController;
use App\Http\Controllers\Api\V1\Auth\RefreshController;
use App\Http\Controllers\Api\V1\Auth\RevokeController;
use App\Http\Controllers\Api\V1\Auth\TokenController;
use App\Http\Controllers\Api\V1\Collab\CollabController;
use App\Http\Controllers\Api\V1\Dav\CapabilitiesController as DavCapabilitiesController;
use App\Http\Controllers\Api\V1\Drive\DriveController;
use App\Http\Controllers\Api\V1\Home\StateController as HomeStateController;
use App\Http\Controllers\Api\V1\Installer\ActionController as InstallerActionController;
use App\Http\Controllers\Api\V1\Installer\BootstrapController as InstallerBootstrapController;
use App\Http\Controllers\Api\V1\Installer\StateController as InstallerStateController;
use App\Http\Controllers\Api\V1\Mail\MailController;
use App\Http\Controllers\Api\V1\Notes\CapabilitiesController as NotesCapabilitiesController;
use App\Http\Controllers\Api\V1\Notes\ItemsController as NotesItemsController;
use App\Http\Controllers\Api\V1\Notes\NotebooksController;
use App\Http\Controllers\Api\V1\Notes\StateController as NotesStateController;
use App\Http\Controllers\Api\V1\Office\CapabilitiesController as OfficeCapabilitiesController;
use App\Http\Controllers\Api\V1\Office\DocumentsController as OfficeDocumentsController;
use App\Http\Controllers\Api\V1\Office\SessionController as OfficeSessionController;
use App\Http\Controllers\Api\V1\Plugins\ActivateController as PluginsActivateController;
use App\Http\Controllers\Api\V1\Plugins\DeactivateController as PluginsDeactivateController;
use App\Http\Controllers\Api\V1\Plugins\IndexController as PluginsIndexController;
use App\Http\Controllers\Api\V1\Settings\MailController as SettingsMailController;
use App\Http\Controllers\Api\V1\Settings\ProfileController as SettingsProfileController;
use App\Http\Controllers\Api\V1\Settings\StateController as SettingsStateController;
use App\Http\Controllers\Api\V1\System\CapabilitiesController;
use App\Http\Controllers\Api\V1\System\HealthController;
use App\Http\Controllers\Api\V1\Voice\VoiceController;
use Illuminate\Cookie\Middleware\AddQueuedCookiesToResponse;
use Illuminate\Cookie\Middleware\EncryptCookies;
use Illuminate\Session\Middleware\StartSession;
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

Route::post('voice/room', [VoiceController::class, 'room']);
Route::post('voice/join', [VoiceController::class, 'join']);
Route::post('voice/poll', [VoiceController::class, 'poll']);
Route::post('voice/send', [VoiceController::class, 'send']);
Route::post('voice/leave', [VoiceController::class, 'leave']);
Route::post('voice/chat', [VoiceController::class, 'chat']);

Route::middleware([
    EncryptCookies::class,
    AddQueuedCookiesToResponse::class,
    StartSession::class,
])->group(function (): void {
    Route::get('installer/state', InstallerStateController::class);
    Route::get('installer/bootstrap', InstallerBootstrapController::class);
    Route::post('installer/action', InstallerActionController::class);
});

$driveSession = [
    EncryptCookies::class,
    AddQueuedCookiesToResponse::class,
    StartSession::class,
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
    Route::get('plugins', PluginsIndexController::class);
    Route::post('plugins/{id}/activate', PluginsActivateController::class)
        ->where('id', '[a-z0-9_-]+');
    Route::post('plugins/{id}/deactivate', PluginsDeactivateController::class)
        ->where('id', '[a-z0-9_-]+');
    Route::get('settings/state', SettingsStateController::class);
    Route::put('settings/profile', SettingsProfileController::class);
    Route::put('settings/mail', SettingsMailController::class);

    Route::get('mail/status', [MailController::class, 'status']);
    Route::get('mail/folders', [MailController::class, 'foldersIndex']);
    Route::post('mail/folders', [MailController::class, 'foldersStore']);
    Route::patch('mail/folders', [MailController::class, 'foldersUpdate']);
    Route::delete('mail/folders', [MailController::class, 'foldersDestroy']);
    Route::get('mail/messages', [MailController::class, 'messagesIndex']);
    Route::get('mail/messages/attachments', [MailController::class, 'messageAttachments']);
    Route::get('mail/message', [MailController::class, 'messageShow']);
    Route::patch('mail/message', [MailController::class, 'messageUpdate']);
    Route::delete('mail/message', [MailController::class, 'messageDestroy']);
    Route::get('mail/message/attachment', [MailController::class, 'messageAttachment']);
    Route::post('mail/move', [MailController::class, 'move']);
    Route::post('mail/send', [MailController::class, 'send']);
    Route::post('mail/draft', [MailController::class, 'draft']);

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

    Route::post('collab/join', [CollabController::class, 'join']);
    Route::post('collab/poll', [CollabController::class, 'poll']);
    Route::post('collab/send', [CollabController::class, 'send']);
    Route::post('collab/leave', [CollabController::class, 'leave']);
    Route::get('collab/document', [CollabController::class, 'getDocument']);
    Route::put('collab/document', [CollabController::class, 'putDocument']);
});

Route::middleware(['wgw.auth', 'wgw.role:admin'])->prefix('admin')->group(function (): void {
    Route::get('state', AdminStateController::class);
    Route::post('users', [AdminUsersController::class, 'store']);
    Route::patch('users/{username}', [AdminUsersController::class, 'update'])
        ->where('username', '[a-z0-9_-]+');
    Route::delete('users/{username}', [AdminUsersController::class, 'destroy'])
        ->where('username', '[a-z0-9_-]+');
    Route::post('groups', [AdminGroupsController::class, 'store']);
    Route::patch('groups/{group}', [AdminGroupsController::class, 'update'])
        ->where('group', '[a-z0-9_-]+');
    Route::delete('groups/{group}', [AdminGroupsController::class, 'destroy'])
        ->where('group', '[a-z0-9_-]+');
    Route::put('settings', AdminSettingsController::class);
    Route::get('updates/state', AdminUpdateStateController::class);
    Route::get('updates/log', [AdminUpdateLogController::class, 'show']);
    Route::delete('updates/log', [AdminUpdateLogController::class, 'destroy']);
    Route::post('updates/check', AdminUpdateCheckController::class);
    Route::post('updates/apply', AdminUpdateApplyController::class);
    Route::post('updates/cancel', AdminUpdateCancelController::class);
    Route::post('plugins/install', AdminPluginInstallController::class);
    Route::get('updates/backups/{name}', [AdminUpdateBackupController::class, 'show']);
    Route::delete('updates/backups/{name}', [AdminUpdateBackupController::class, 'destroy']);
    Route::put('groups/{group}/members/{username}', [AdminGroupMemberController::class, 'store']);
    Route::delete('groups/{group}/members/{username}', [AdminGroupMemberController::class, 'destroy']);
});
