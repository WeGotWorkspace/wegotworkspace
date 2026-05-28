<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Admin;

use App\Exceptions\ApiHttpException;
use App\Services\Search\SearchReindexOperationsService;
use App\Services\Search\SearchReindexStateService;
use Illuminate\Http\JsonResponse;

final class SearchReindexCancelController
{
    public function __construct(
        private SearchReindexOperationsService $ops,
        private SearchReindexStateService $state,
    ) {}

    public function __invoke(): JsonResponse
    {
        try {
            $this->ops->cancel();

            return response()->json(['state' => $this->state->snapshot()]);
        } catch (\InvalidArgumentException $e) {
            throw new ApiHttpException(400, $e->getMessage(), 'bad_request');
        }
    }
}
