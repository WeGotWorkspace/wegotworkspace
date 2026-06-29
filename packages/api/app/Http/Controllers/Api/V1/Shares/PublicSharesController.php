<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Shares;

use App\Exceptions\ApiHttpException;
use App\Http\Requests\Api\V1\ShareConfirmRequest;
use App\Http\Requests\Api\V1\SharePublicDirectoryRequest;
use App\Http\Requests\Api\V1\ShareSelfRequestRequest;
use App\Models\FileShare;
use App\Services\Shares\ResolvedShareAccess;
use App\Services\Shares\ShareAccessResolver;
use App\Services\Shares\ShareAvailability;
use App\Services\Shares\ShareFileService;
use App\Services\Shares\ShareGrantService;
use App\Services\Shares\ShareRateLimiter;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use Symfony\Component\HttpFoundation\Response;

/**
 * Public/recipient-side share access (OUTSIDE the auth group; x-wgw-access: guest).
 * Credentials: the link token in the path, plus the confirmed-recipient access
 * token presented via the `X-Wgw-Share-Access` header. Public-access shares
 * need no credential.
 */
final class PublicSharesController
{
    private const ACCESS_HEADER = 'X-Wgw-Share-Access';

    public function __construct(
        private ShareAccessResolver $resolver,
        private ShareGrantService $grants,
        private ShareFileService $files,
        private ShareRateLimiter $rateLimiter,
        private ShareAvailability $availability,
    ) {}

    public function show(Request $request, string $token): JsonResponse
    {
        return $this->guard(function () use ($request, $token): JsonResponse {
            $share = $this->resolver->findActiveShare($token);
            if ($share === null) {
                throw new ApiHttpException(404, 'Share not found.', 'not_found');
            }

            $accessToken = $this->accessToken($request);
            $permission = $this->resolver->effectivePermission($share, $accessToken);

            return response()->json(['data' => [
                'token' => (string) $share->token,
                'name' => basename((string) $share->target_path),
                'targetType' => (string) $share->target_type,
                'publicAccess' => (string) $share->public_access,
                'permission' => $permission,
                'requiresConfirmation' => $permission === FileShare::PUBLIC_NONE,
                'expiresAt' => $share->expires_at?->toIso8601String(),
            ]]);
        });
    }

    public function requestGrant(ShareSelfRequestRequest $request, string $token): JsonResponse
    {
        $email = (string) $request->validated('email');
        if (! $this->rateLimiter->allow('grant', $email, (string) $request->ip())) {
            throw new ApiHttpException(429, 'Too many requests. Please try again later.', 'too_many_requests');
        }

        return $this->guard(fn (): JsonResponse => response()->json([
            'data' => $this->grants->requestAccess($token, $email),
        ], 202));
    }

    public function confirm(ShareConfirmRequest $request): JsonResponse
    {
        $inviteToken = (string) $request->validated('inviteToken');
        if (! $this->rateLimiter->allow('confirm', $inviteToken, (string) $request->ip())) {
            throw new ApiHttpException(429, 'Too many requests. Please try again later.', 'too_many_requests');
        }

        return $this->guard(fn (): JsonResponse => response()->json([
            'data' => $this->grants->confirm($inviteToken),
        ]));
    }

    public function children(Request $request, string $token): JsonResponse
    {
        return $this->guard(function () use ($request, $token): JsonResponse {
            $access = $this->requireAccess($request, $token);

            return response()->json([
                'data' => $this->files->listChildren($access, $this->relPath($request)),
            ]);
        });
    }

    public function content(Request $request, string $token): Response
    {
        if ($request->isMethod('POST')) {
            return $this->upload($request, $token);
        }

        return $this->download($request, $token);
    }

    public function storeDirectory(SharePublicDirectoryRequest $request, string $token): JsonResponse
    {
        return $this->guard(function () use ($request, $token): JsonResponse {
            $access = $this->requireAccess($request, $token);
            $parent = $request->validated('path');

            return response()->json([
                'data' => $this->files->makeDirectory(
                    $access,
                    is_string($parent) ? $parent : null,
                    (string) $request->validated('name'),
                ),
            ], 201);
        });
    }

    private function download(Request $request, string $token): Response
    {
        try {
            $this->availability->assertEnabled();
            $access = $this->requireAccess($request, $token);

            return $this->files->downloadResponse($access, $this->relPath($request));
        } catch (ApiHttpException $e) {
            throw $e;
        } catch (\InvalidArgumentException $e) {
            throw new ApiHttpException(400, $e->getMessage(), 'bad_request');
        } catch (\RuntimeException $e) {
            throw new ApiHttpException(404, $e->getMessage(), 'not_found');
        }
    }

    private function upload(Request $request, string $token): Response
    {
        try {
            $this->availability->assertEnabled();
            $access = $this->requireAccess($request, $token);
            $file = $request->file('file');
            if (! $file instanceof UploadedFile) {
                throw new \InvalidArgumentException('Missing upload file.');
            }

            $parent = $request->query('path');
            $result = $this->files->handleUpload(
                $access,
                is_string($parent) && $parent !== '' ? $parent : null,
                $file,
                (string) $request->input('resumableFilename', $file->getClientOriginalName()),
                (string) $request->input('resumableIdentifier', ''),
                max(1, (int) $request->input('resumableChunkNumber', 1)),
                max(1, (int) $request->input('resumableTotalChunks', 1)),
            );

            return response($result, 200)->header('Content-Type', 'text/plain; charset=utf-8');
        } catch (ApiHttpException $e) {
            throw $e;
        } catch (\InvalidArgumentException $e) {
            throw new ApiHttpException(400, $e->getMessage(), 'bad_request');
        } catch (\RuntimeException $e) {
            throw new ApiHttpException(404, $e->getMessage(), 'not_found');
        }
    }

    private function requireAccess(Request $request, string $token): ResolvedShareAccess
    {
        $share = $this->resolver->findActiveShare($token);
        if ($share === null) {
            throw new ApiHttpException(404, 'Share not found.', 'not_found');
        }

        $access = $this->resolver->resolve($token, $this->accessToken($request));
        if ($access === null) {
            throw new ApiHttpException(403, 'This share requires confirmed access.', 'forbidden');
        }

        return $access;
    }

    private function accessToken(Request $request): ?string
    {
        $value = $request->header(self::ACCESS_HEADER);

        return is_string($value) && trim($value) !== '' ? trim($value) : null;
    }

    private function relPath(Request $request): string
    {
        $path = $request->query('path');

        return is_string($path) ? $path : '';
    }

    /**
     * @param  callable(): JsonResponse  $callback
     */
    private function guard(callable $callback): JsonResponse
    {
        try {
            return $callback();
        } catch (ApiHttpException $e) {
            throw $e;
        } catch (\InvalidArgumentException $e) {
            throw new ApiHttpException(400, $e->getMessage(), 'bad_request');
        } catch (\RuntimeException $e) {
            throw new ApiHttpException(404, $e->getMessage(), 'not_found');
        }
    }
}
