<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Admin;

use App\Exceptions\ApiHttpException;
use App\Services\Update\UpdateOperationsService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

final class UpdateApplyController
{
    public function __construct(private UpdateOperationsService $updates)
    {
    }

    public function __invoke(Request $request): JsonResponse
    {
        try {
            /** @var array<string, mixed> $input */
            $input = $request->all();

            return response()->json($this->updates->apply($input));
        } catch (\InvalidArgumentException $e) {
            throw new ApiHttpException(400, $e->getMessage(), 'bad_request');
        } catch (\RuntimeException $e) {
            throw new ApiHttpException(503, $e->getMessage(), 'unavailable');
        }
    }
}
