<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Search;

use App\Exceptions\ApiHttpException;
use App\Http\Middleware\AuthenticateWgwApi;
use App\Http\Requests\Api\V1\UnifiedSearchRequest;
use App\Services\Search\UnifiedSearchService;
use Illuminate\Http\JsonResponse;

final class UnifiedSearchController
{
    public function __construct(private UnifiedSearchService $search) {}

    public function __invoke(UnifiedSearchRequest $request): JsonResponse
    {
        $validated = $request->validated();
        /** @var array{username: string, role: string} $principal */
        $principal = $request->attributes->get(AuthenticateWgwApi::PRINCIPAL_ATTRIBUTE);

        try {
            return response()->json([
                'data' => $this->search->search(
                    (string) $principal['username'],
                    (string) $validated['q'],
                    isset($validated['limit']) ? (int) $validated['limit'] : 25,
                    isset($validated['sources']) && is_array($validated['sources'])
                        ? array_values(array_filter($validated['sources'], 'is_string'))
                        : []
                ),
            ]);
        } catch (\InvalidArgumentException $e) {
            throw new ApiHttpException(400, $e->getMessage(), 'bad_request');
        }
    }
}
