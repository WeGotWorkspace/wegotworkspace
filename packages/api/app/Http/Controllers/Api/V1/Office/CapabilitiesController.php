<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Office;

use App\Services\Office\OfficeCapabilitiesService;
use Illuminate\Http\JsonResponse;

final class CapabilitiesController
{
    public function __construct(private OfficeCapabilitiesService $office)
    {
    }

    public function __invoke(): JsonResponse
    {
        return response()->json($this->office->snapshot());
    }
}
