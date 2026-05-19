<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Admin;

use App\Exceptions\ApiHttpException;
use App\Services\Update\UpdateOperationsService;
use Illuminate\Http\JsonResponse;

final class UpdateCheckController
{
    public function __construct(private UpdateOperationsService $updates)
    {
    }

    public function __invoke(): JsonResponse
    {
        try {
            return response()->json($this->updates->check());
        } catch (\InvalidArgumentException $e) {
            throw new ApiHttpException(400, $e->getMessage(), 'bad_request');
        }
    }
}
