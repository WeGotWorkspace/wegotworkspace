<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Tasks;

use Illuminate\Http\JsonResponse;

final class CapabilitiesController
{
    public function __invoke(): JsonResponse
    {
        return response()->json(['ok' => false, 'message' => 'Tasks API not yet implemented.']);
    }
}
