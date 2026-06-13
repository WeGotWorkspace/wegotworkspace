<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Tasks;

use App\Services\Tasks\TasksCapabilitiesService;
use Illuminate\Http\JsonResponse;

final class CapabilitiesController
{
    public function __construct(private readonly TasksCapabilitiesService $capabilities) {}

    public function __invoke(): JsonResponse
    {
        return response()->json($this->capabilities->snapshot());
    }
}
