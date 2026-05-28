<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Admin;

use App\Exceptions\ApiHttpException;
use App\Services\Search\SearchReindexOperationsService;
use Illuminate\Http\JsonResponse;

final class SearchReindexRunController
{
    public function __construct(private SearchReindexOperationsService $ops) {}

    public function __invoke(): JsonResponse
    {
        try {
            return response()->json($this->ops->run());
        } catch (\InvalidArgumentException $e) {
            throw new ApiHttpException(400, $e->getMessage(), 'bad_request');
        } catch (\RuntimeException $e) {
            throw new ApiHttpException(503, $e->getMessage(), 'unavailable');
        }
    }
}
