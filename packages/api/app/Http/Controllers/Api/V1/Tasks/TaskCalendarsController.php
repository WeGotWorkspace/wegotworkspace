<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Tasks;

use App\Http\Middleware\AuthenticateWgwApi;
use App\Http\Requests\Api\V1\TaskListCreateRequest;
use App\Http\Requests\Api\V1\TaskListDeleteRequest;
use App\Http\Requests\Api\V1\TaskListPatchRequest;
use App\Services\Tasks\TaskListRepository;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

final class TaskCalendarsController
{
    public function __construct(private readonly TaskListRepository $taskLists) {}

    public function index(Request $request): JsonResponse
    {
        $principal = $request->attributes->get(AuthenticateWgwApi::PRINCIPAL_ATTRIBUTE);

        return response()->json($this->taskLists->list($principal['username']));
    }

    public function show(Request $request, string $taskListId): JsonResponse
    {
        $principal = $request->attributes->get(AuthenticateWgwApi::PRINCIPAL_ATTRIBUTE);

        return response()->json($this->taskLists->show($principal['username'], $taskListId));
    }

    public function store(TaskListCreateRequest $request): JsonResponse
    {
        $principal = $request->attributes->get(AuthenticateWgwApi::PRINCIPAL_ATTRIBUTE);

        return response()->json($this->taskLists->create($principal['username'], $request->validated()), 201);
    }

    public function update(TaskListPatchRequest $request, string $taskListId): JsonResponse
    {
        $principal = $request->attributes->get(AuthenticateWgwApi::PRINCIPAL_ATTRIBUTE);

        return response()->json($this->taskLists->update($principal['username'], $taskListId, $request->validated()));
    }

    public function destroy(TaskListDeleteRequest $request, string $taskListId): JsonResponse
    {
        $principal = $request->attributes->get(AuthenticateWgwApi::PRINCIPAL_ATTRIBUTE);

        return response()->json($this->taskLists->delete($principal['username'], $taskListId, $request->validated()));
    }

    public function changes(Request $request): JsonResponse
    {
        $principal = $request->attributes->get(AuthenticateWgwApi::PRINCIPAL_ATTRIBUTE);
        $since = $request->query('since');

        return response()->json($this->taskLists->changes($principal['username'], is_string($since) ? $since : null));
    }
}
