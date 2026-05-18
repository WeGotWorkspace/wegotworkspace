<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Settings;

use App\Http\Middleware\AuthenticateWgwApi;
use App\Http\Resources\Api\V1\SettingsStateResource;
use App\Services\Settings\SettingsStateService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

final class StateController
{
    public function __construct(private SettingsStateService $settings)
    {
    }

    public function __invoke(Request $request): JsonResponse
    {
        /** @var array{username: string, role: string} $principal */
        $principal = $request->attributes->get(AuthenticateWgwApi::PRINCIPAL_ATTRIBUTE);

        return (new SettingsStateResource(
            $this->settings->forUsername($principal['username'])
        ))->response();
    }
}
