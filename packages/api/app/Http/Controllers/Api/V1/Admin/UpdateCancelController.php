<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Admin;

use App\Exceptions\ApiHttpException;
use App\Services\Update\UpdateOperationsService;
use App\Services\Update\UpdateStateService;
use Illuminate\Http\JsonResponse;

final class UpdateCancelController
{
    public function __construct(
        private UpdateOperationsService $updates,
        private UpdateStateService $state,
    ) {
    }

    public function __invoke(): JsonResponse
    {
        try {
            $this->updates->cancel();

            return response()->json(['state' => $this->state->snapshot()]);
        } catch (\InvalidArgumentException $e) {
            throw new ApiHttpException(400, $e->getMessage(), 'bad_request');
        }
    }
}
