<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Middleware\AuthenticateWgwApi;
use App\Services\Admin\AdminStateService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

final class StateController
{
    public function __construct(private AdminStateService $admin)
    {
    }

    public function __invoke(Request $request): JsonResponse
    {
        /** @var array{username: string} $principal */
        $principal = $request->attributes->get(AuthenticateWgwApi::PRINCIPAL_ATTRIBUTE);

        return response()->json($this->admin->snapshot($principal['username']));
    }
}
