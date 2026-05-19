<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Drive;

use App\Exceptions\ApiHttpException;
use App\Http\Middleware\AuthenticateWgwApi;
use App\Http\Requests\Api\V1\DriveChangeDirRequest;
use App\Http\Requests\Api\V1\DriveCreateRequest;
use App\Http\Requests\Api\V1\DriveDeleteItemsRequest;
use App\Http\Requests\Api\V1\DriveGetDirRequest;
use App\Http\Requests\Api\V1\DriveRenameRequest;
use App\Http\Requests\Api\V1\DriveSearchRequest;
use App\Http\Requests\Api\V1\DriveStarUpdateRequest;
use App\Services\Drive\DriveGroupResolver;
use App\Services\Drive\DriveService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

final class DriveController
{
    public function __construct(
        private DriveService $drive,
        private DriveGroupResolver $groups,
    ) {
    }

    public function user(Request $request): JsonResponse
    {
        return $this->jsonData(fn () => $this->drive->userContext($this->username($request)));
    }

    public function getDir(DriveGetDirRequest $request): JsonResponse
    {
        $dir = (string) $request->validated('dir');

        return $this->jsonData(fn () => $this->drive->listDirectory($this->username($request), $dir));
    }

    public function searchFiles(DriveSearchRequest $request): JsonResponse
    {
        $validated = $request->validated();

        return $this->jsonData(fn () => $this->drive->search(
            $this->username($request),
            (string) ($validated['q'] ?? ''),
            (int) ($validated['limit'] ?? 50),
        ));
    }

    public function changeDir(DriveChangeDirRequest $request): JsonResponse
    {
        $to = (string) ($request->validated('to') ?? '/');

        return $this->jsonData(fn () => $this->drive->changeDirectory($this->username($request), $to));
    }

    public function createNew(DriveCreateRequest $request): JsonResponse
    {
        $validated = $request->validated();

        return $this->jsonData(fn () => $this->drive->createItem(
            $this->username($request),
            (string) $validated['name'],
            (string) $validated['type'],
            isset($validated['cwd']) ? (string) $validated['cwd'] : null,
        ));
    }

    public function renameItem(DriveRenameRequest $request): JsonResponse
    {
        $validated = $request->validated();

        return $this->jsonData(fn () => $this->drive->renameItem(
            $this->username($request),
            (string) $validated['destination'],
            (string) $validated['from'],
            (string) $validated['to'],
        ));
    }

    public function deleteItems(DriveDeleteItemsRequest $request): JsonResponse
    {
        $items = $request->validated('items');

        return $this->jsonData(fn () => $this->drive->deleteItems(
            $this->username($request),
            is_array($items) ? $items : [],
        ));
    }

    public function download(Request $request): Response
    {
        try {
            $this->drive->assertFilesEnabled();

            return $this->drive->downloadResponse(
                $this->username($request),
                (string) $request->query('path', ''),
            );
        } catch (\InvalidArgumentException $e) {
            throw new ApiHttpException(400, $e->getMessage(), 'bad_request');
        } catch (\RuntimeException $e) {
            throw new ApiHttpException(404, $e->getMessage(), 'not_found');
        }
    }

    public function uploadProbe(): Response
    {
        try {
            $this->drive->assertFilesEnabled();

            return response('OK', 200)->header('Content-Type', 'text/plain; charset=utf-8');
        } catch (\RuntimeException $e) {
            throw new ApiHttpException(404, $e->getMessage(), 'not_found');
        }
    }

    public function upload(Request $request): Response
    {
        try {
            $file = $request->file('file');
            if (! $file instanceof \Illuminate\Http\UploadedFile) {
                throw new \InvalidArgumentException('Missing upload file.');
            }

            $result = $this->drive->handleUpload(
                $this->username($request),
                $file,
                (string) $request->input('resumableFilename', ''),
                (string) $request->input('resumableIdentifier', ''),
                max(1, (int) $request->input('resumableChunkNumber', 1)),
                max(1, (int) $request->input('resumableTotalChunks', 1)),
                $request->input('cwd') !== null ? (string) $request->input('cwd') : null,
            );

            return response($result, 200)->header('Content-Type', 'text/plain; charset=utf-8');
        } catch (\InvalidArgumentException $e) {
            throw new ApiHttpException(400, $e->getMessage(), 'bad_request');
        } catch (\RuntimeException $e) {
            throw new ApiHttpException(404, $e->getMessage(), 'not_found');
        }
    }

    public function starsIndex(Request $request): JsonResponse
    {
        $username = $this->username($request);
        $groupSlugs = $this->groups->allowedGroupSlugs($username);

        return $this->jsonData(fn () => [
            'paths' => $this->drive->listStarredPaths($username, $groupSlugs),
        ]);
    }

    public function starsUpdate(DriveStarUpdateRequest $request): JsonResponse
    {
        $validated = $request->validated();

        return $this->jsonData(fn () => $this->drive->updateStar(
            $this->username($request),
            (string) $validated['path'],
            (bool) $validated['starred'],
        ));
    }

    /**
     * @param callable(): mixed $callback
     */
    private function jsonData(callable $callback): JsonResponse
    {
        try {
            return response()->json(['data' => $callback()]);
        } catch (\InvalidArgumentException $e) {
            throw new ApiHttpException(400, $e->getMessage(), 'bad_request');
        } catch (\RuntimeException $e) {
            throw new ApiHttpException(404, $e->getMessage(), 'not_found');
        }
    }

    /**
     * @return array{username: string, role: string}
     */
    private function principal(Request $request): array
    {
        /** @var array{username: string, role: string} $principal */
        $principal = $request->attributes->get(AuthenticateWgwApi::PRINCIPAL_ATTRIBUTE);

        return $principal;
    }

    private function username(Request $request): string
    {
        return $this->principal($request)['username'];
    }
}
