<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\System;

use App\Services\System\HealthService;
use Illuminate\Http\JsonResponse;

final class HealthController
{
    public function __construct(private HealthService $health) {}

    public function __invoke(): JsonResponse
    {
        return response()->json($this->health->snapshot());
    }
}
