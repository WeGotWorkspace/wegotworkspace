<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Dav;

use App\Services\Dav\DavCapabilitiesService;
use Illuminate\Http\JsonResponse;

final class CapabilitiesController
{
    public function __construct(private DavCapabilitiesService $dav) {}

    public function __invoke(): JsonResponse
    {
        return response()->json($this->dav->snapshot());
    }
}
