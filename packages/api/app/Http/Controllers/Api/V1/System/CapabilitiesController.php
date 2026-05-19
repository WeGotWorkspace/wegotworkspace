<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\System;

use App\Services\System\CapabilitiesService;
use Illuminate\Http\JsonResponse;

final class CapabilitiesController
{
    public function __construct(private CapabilitiesService $capabilities)
    {
    }

    public function __invoke(): JsonResponse
    {
        return response()->json($this->capabilities->snapshot());
    }
}
