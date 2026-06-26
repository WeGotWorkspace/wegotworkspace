<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Files;

use App\Exceptions\ApiHttpException;
use App\Http\Middleware\AuthenticateWgwApi;
use App\Http\Requests\Api\V1\ShareCreateRequest;
use App\Http\Requests\Api\V1\ShareGrantsCreateRequest;
use App\Http\Requests\Api\V1\ShareUpdateRequest;
use App\Services\Shares\ShareService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Owner-side management of file/folder shares (under wgw.auth + wgw.role:user).
 */
final class FileSharesController
{
    public function __construct(private ShareService $shares) {}

    public function index(Request $request): JsonResponse
    {
        $path = $request->query('path');

        return $this->jsonData(fn (): array => [
            'shares' => $this->shares->listShares(
                $this->username($request),
                is_string($path) ? $path : null,
            ),
        ]);
    }

    public function store(ShareCreateRequest $request): JsonResponse
    {
        return $this->jsonData(fn (): array => $this->shares->createShare(
            $this->username($request),
            (string) $request->validated('path'),
            (string) $request->validated('publicAccess'),
            $request->has('expiresAt') ? $this->nullableString($request->validated('expiresAt')) : null,
        ), 201);
    }

    public function update(ShareUpdateRequest $request, string $shareId): JsonResponse
    {
        $changes = [];
        if ($request->has('publicAccess')) {
            $changes['publicAccess'] = $request->validated('publicAccess');
        }
        if ($request->has('expiresAt')) {
            $changes['expiresAt'] = $request->validated('expiresAt');
        }

        return $this->jsonData(fn (): array => $this->shares->updateShare(
            $this->username($request),
            $shareId,
            $changes,
        ));
    }

    public function destroy(Request $request, string $shareId): JsonResponse
    {
        return $this->jsonData(function () use ($request, $shareId): string {
            $this->shares->revokeShare($this->username($request), $shareId);

            return 'Revoked';
        });
    }

    public function storeGrants(ShareGrantsCreateRequest $request, string $shareId): JsonResponse
    {
        /** @var list<string> $emails */
        $emails = $request->validated('emails');

        return $this->jsonData(fn (): array => $this->shares->addGrants(
            $this->username($request),
            $shareId,
            $emails,
            (string) $request->validated('permission'),
        ), 201);
    }

    public function destroyGrant(Request $request, string $shareId, string $grantId): JsonResponse
    {
        return $this->jsonData(fn (): array => $this->shares->revokeGrant(
            $this->username($request),
            $shareId,
            $grantId,
        ));
    }

    private function nullableString(mixed $value): ?string
    {
        return is_string($value) && trim($value) !== '' ? $value : null;
    }

    /**
     * @param  callable(): mixed  $callback
     */
    private function jsonData(callable $callback, int $status = 200): JsonResponse
    {
        try {
            return response()->json(['data' => $callback()], $status);
        } catch (\InvalidArgumentException $e) {
            throw new ApiHttpException(400, $e->getMessage(), 'bad_request');
        } catch (\RuntimeException $e) {
            throw new ApiHttpException(404, $e->getMessage(), 'not_found');
        }
    }

    private function username(Request $request): string
    {
        /** @var array{username: string, role: string} $principal */
        $principal = $request->attributes->get(AuthenticateWgwApi::PRINCIPAL_ATTRIBUTE);

        return $principal['username'];
    }
}
