<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Admin;

use App\Services\Search\SearchReindexStateService;
use Illuminate\Http\JsonResponse;

final class SearchReindexStateController
{
    public function __construct(private SearchReindexStateService $state) {}

    public function __invoke(): JsonResponse
    {
        return response()->json($this->state->snapshot());
    }
}
