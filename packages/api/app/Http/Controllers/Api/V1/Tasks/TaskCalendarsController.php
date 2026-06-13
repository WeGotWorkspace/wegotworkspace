<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Tasks;

use App\Http\Middleware\AuthenticateWgwApi;
use App\Services\Tasks\TaskListRepository;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

final class TaskCalendarsController
{
    public function __construct(private readonly TaskListRepository $taskLists) {}

    public function index(Request $request): JsonResponse
    {
        /** @var array{username: string, role: string} $principal */
        $principal = $request->attributes->get(AuthenticateWgwApi::PRINCIPAL_ATTRIBUTE);

        return response()->json($this->taskLists->list($principal['username']));
    }

    public function show(Request $request, string $taskListId): JsonResponse
    {
        /** @var array{username: string, role: string} $principal */
        $principal = $request->attributes->get(AuthenticateWgwApi::PRINCIPAL_ATTRIBUTE);

        return response()->json($this->taskLists->show($principal['username'], $taskListId));
    }
}
