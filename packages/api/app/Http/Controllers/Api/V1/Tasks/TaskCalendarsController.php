<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Tasks;

use Illuminate\Http\JsonResponse;

final class TaskCalendarsController
{
    public function index(): JsonResponse
    {
        return response()->json(['list' => []]);
    }

    public function show(string $taskListId): JsonResponse
    {
        return response()->json(['id' => $taskListId]);
    }
}
