<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Notes;

use App\Http\Middleware\AuthenticateWgwApi;
use App\Services\Notes\NotesStateService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

final class StateController
{
    public function __construct(private NotesStateService $state) {}

    public function __invoke(Request $request): JsonResponse
    {
        /** @var array{username: string, role: string} $principal */
        $principal = $request->attributes->get(AuthenticateWgwApi::PRINCIPAL_ATTRIBUTE);

        return response()->json($this->state->forUser($principal['username']));
    }
}
