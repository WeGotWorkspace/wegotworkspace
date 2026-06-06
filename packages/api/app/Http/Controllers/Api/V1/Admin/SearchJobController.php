<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Admin;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

final class SearchJobController
{
    public function store(Request $request): JsonResponse
    {
        unset($request);

        return app(SearchReindexRunController::class)();
    }

    public function showCurrent(): JsonResponse
    {
        return app(SearchReindexStateController::class)();
    }

    public function destroy(string $jobId): JsonResponse
    {
        unset($jobId);

        return app(SearchReindexCancelController::class)();
    }
}
