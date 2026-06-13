<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Tasks;

use App\Exceptions\ApiHttpException;
use App\Http\Middleware\AuthenticateWgwApi;
use App\Http\Requests\Api\V1\TaskPatchRequest;
use App\Http\Requests\Api\V1\TaskUpsertRequest;
use App\Services\Tasks\TaskRepository;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

final class TasksController
{
    public function __construct(private readonly TaskRepository $tasks) {}

    public function index(Request $request): JsonResponse
    {
        /** @var array{username: string, role: string} $principal */
        $principal = $request->attributes->get(AuthenticateWgwApi::PRINCIPAL_ATTRIBUTE);

        $taskListId = $request->query('taskListId');
        if (! is_string($taskListId) || trim($taskListId) === '') {
            throw new ApiHttpException(400, 'taskListId is required.', 'bad_request');
        }

        return response()->json($this->tasks->list($principal['username'], $taskListId));
    }

    public function show(Request $request, string $taskId): JsonResponse
    {
        /** @var array{username: string, role: string} $principal */
        $principal = $request->attributes->get(AuthenticateWgwApi::PRINCIPAL_ATTRIBUTE);

        return response()->json($this->tasks->show($principal['username'], $taskId));
    }

    public function store(TaskUpsertRequest $request): JsonResponse
    {
        /** @var array{username: string, role: string} $principal */
        $principal = $request->attributes->get(AuthenticateWgwApi::PRINCIPAL_ATTRIBUTE);

        return response()->json(
            $this->tasks->create($principal['username'], $request->json()->all()),
            201
        );
    }

    public function update(TaskUpsertRequest $request, string $taskId): JsonResponse
    {
        /** @var array{username: string, role: string} $principal */
        $principal = $request->attributes->get(AuthenticateWgwApi::PRINCIPAL_ATTRIBUTE);

        return response()->json(
            $this->tasks->update($principal['username'], $taskId, $request->json()->all())
        );
    }

    public function patch(TaskPatchRequest $request, string $taskId): JsonResponse
    {
        /** @var array{username: string, role: string} $principal */
        $principal = $request->attributes->get(AuthenticateWgwApi::PRINCIPAL_ATTRIBUTE);

        return response()->json(
            $this->tasks->patch($principal['username'], $taskId, $request->json()->all())
        );
    }

    public function destroy(Request $request, string $taskId): JsonResponse
    {
        /** @var array{username: string, role: string} $principal */
        $principal = $request->attributes->get(AuthenticateWgwApi::PRINCIPAL_ATTRIBUTE);

        return response()->json($this->tasks->delete($principal['username'], $taskId));
    }
}
