<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Notes;

use App\Services\Notes\NotesCapabilitiesService;
use Illuminate\Http\JsonResponse;

final class CapabilitiesController
{
    public function __construct(private NotesCapabilitiesService $capabilities)
    {
    }

    public function __invoke(): JsonResponse
    {
        return response()->json($this->capabilities->snapshot());
    }
}
