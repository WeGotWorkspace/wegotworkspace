<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Office;

use App\Http\Middleware\AuthenticateWgwApi;
use App\Services\Auth\UiSessionService;
use App\Services\Installer\InstallerWebBase;
use App\Support\WgwSettings;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

final class SessionController
{
    public function __construct(private UiSessionService $uiSession) {}

    public function __invoke(Request $request): JsonResponse
    {
        /** @var array{username: string} $principal */
        $principal = $request->attributes->get(AuthenticateWgwApi::PRINCIPAL_ATTRIBUTE);
        $cfg = WgwSettings::normalized();
        $realm = (string) ($cfg[WgwSettings::AUTH_REALM] ?? 'SabreDAV');

        $cookie = $this->uiSession->establish(
            $principal['username'],
            $realm,
            InstallerWebBase::detect(),
        );

        return response()->json(['ok' => true])->withCookie($cookie);
    }
}
