<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Tasks;

use Illuminate\Http\JsonResponse;

final class TasksController
{
    public function index(): JsonResponse
    {
        return response()->json(['list' => []]);
    }

    public function store(): JsonResponse
    {
        return response()->json([], 501);
    }

    public function show(string $taskId): JsonResponse
    {
        return response()->json(['id' => $taskId]);
    }

    public function update(string $taskId): JsonResponse
    {
        return response()->json(['id' => $taskId]);
    }

    public function patch(string $taskId): JsonResponse
    {
        return response()->json(['id' => $taskId]);
    }

    public function destroy(string $taskId): JsonResponse
    {
        return response()->json(['ok' => true]);
    }
}
