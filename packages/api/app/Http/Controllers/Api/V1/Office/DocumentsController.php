<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Office;

use App\Exceptions\ApiHttpException;
use App\Http\Middleware\AuthenticateWgwApi;
use App\Http\Requests\Api\V1\OfficeDocumentCreateRequest;
use App\Http\Requests\Api\V1\OfficeDocumentUpdateRequest;
use App\Services\Office\OfficeDocumentService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

final class DocumentsController
{
    public function __construct(private OfficeDocumentService $documents)
    {
    }

    public function store(OfficeDocumentCreateRequest $request): JsonResponse
    {
        return $this->respond(fn () => $this->documents->create(
            $this->username($request),
            $request->validated(),
        ));
    }

    public function update(OfficeDocumentUpdateRequest $request): JsonResponse
    {
        return $this->respond(fn () => $this->documents->update(
            $this->username($request),
            $request->validated(),
        ));
    }

    /**
     * @param callable(): array{ok: bool, path: string, bytes: int} $callback
     */
    private function respond(callable $callback): JsonResponse
    {
        try {
            return response()->json($callback());
        } catch (\InvalidArgumentException $e) {
            throw new ApiHttpException(400, $e->getMessage(), 'bad_request');
        } catch (\RuntimeException $e) {
            throw new ApiHttpException(404, $e->getMessage(), 'not_found');
        }
    }

    private function username(Request $request): string
    {
        /** @var array{username: string} $principal */
        $principal = $request->attributes->get(AuthenticateWgwApi::PRINCIPAL_ATTRIBUTE);

        return $principal['username'];
    }
}
