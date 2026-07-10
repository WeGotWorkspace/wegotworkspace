<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Files;

use App\Exceptions\ApiHttpException;
use App\Http\Middleware\AuthenticateWgwApi;
use App\Http\Requests\Api\V1\FilesBulkDeleteRequest;
use App\Services\Collab\DocCollabDocumentService;
use App\Services\Drive\DriveGroupResolver;
use App\Services\Drive\DriveService;
use App\Services\Rtc\RoomIdCodec;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use Symfony\Component\HttpFoundation\Response;

final class FilesController
{
    public function __construct(
        private DriveService $drive,
        private DriveGroupResolver $groups,
        private RoomIdCodec $roomIds,
        private DocCollabDocumentService $collabDocuments,
    ) {}

    public function context(Request $request): JsonResponse
    {
        $principal = $this->principal($request);

        return $this->jsonData(fn () => $this->drive->userContext($principal['username']));
    }

    public function children(Request $request): JsonResponse
    {
        $path = $this->requirePath($request);
        $principal = $this->principal($request);

        return $this->jsonData(fn () => $this->drive->listDirectory($principal, $path));
    }

    public function index(Request $request): JsonResponse
    {
        $principal = $this->principal($request);
        if ($request->query('search') === null) {
            throw new ApiHttpException(400, 'Missing search query parameter.', 'bad_request');
        }

        return $this->jsonData(fn () => $this->drive->search(
            $principal['username'],
            (string) $request->query('search', ''),
            max(1, min(100, (int) $request->query('limit', 50))),
        ));
    }

    public function storeDirectory(Request $request): JsonResponse
    {
        $parent = $this->requirePath($request);
        $name = (string) $request->input('name', '');
        $principal = $this->principal($request);
        if ($name === '') {
            throw new ApiHttpException(400, 'Missing name.', 'bad_request');
        }

        $type = (string) $request->input('type', 'dir');
        if ($type !== 'dir' && $type !== 'file') {
            throw new ApiHttpException(400, 'Invalid type.', 'bad_request');
        }

        return $this->jsonData(fn () => $this->drive->createItem(
            $principal,
            $name,
            $type,
            $parent,
        ));
    }

    public function patch(Request $request): JsonResponse
    {
        $path = $this->requirePath($request);
        $principal = $this->principal($request);
        $name = (string) $request->input('name', '');
        if ($name === '') {
            throw new ApiHttpException(400, 'Missing name.', 'bad_request');
        }

        $destinationInput = $request->input('destination');
        if (is_string($destinationInput) && trim($destinationInput) !== '') {
            $destination = trim($destinationInput);
            $from = $path;
        } else {
            $destination = dirname($path);
            if ($destination === '.') {
                $destination = '/';
            }
            $from = basename($path);
        }

        return $this->jsonData(fn () => $this->drive->renameItem(
            $principal,
            $destination,
            $from,
            $name,
        ));
    }

    public function destroy(Request $request): JsonResponse
    {
        $principal = $this->principal($request);
        if ($request->query('path') !== null) {
            $path = $this->requirePath($request);

            return $this->jsonData(fn () => $this->drive->deleteItems(
                $principal,
                [['path' => $path]],
            ));
        }

        $bulk = FilesBulkDeleteRequest::createFrom($request);
        $bulk->setContainer(app())->setRedirector(app('redirect'));
        $bulk->validateResolved();

        return $this->destroyBulk($bulk, $principal);
    }

    public function destroyBulk(FilesBulkDeleteRequest $request, ?array $principal = null): JsonResponse
    {
        $paths = $request->validated('paths');
        $principal ??= $this->principal($request);
        $items = array_map(
            static fn (string $path): array => ['path' => $path],
            is_array($paths) ? $paths : [],
        );

        return $this->jsonData(fn () => $this->drive->deleteItems(
            $principal,
            $items,
        ));
    }

    public function content(Request $request): Response
    {
        if ($request->isMethod('HEAD')) {
            return $this->uploadProbe();
        }
        if ($request->isMethod('POST')) {
            return $this->upload($request);
        }

        return $this->download($request);
    }

    public function download(Request $request): Response
    {
        try {
            $this->drive->assertFilesEnabled();

            return $this->drive->downloadResponse(
                $this->principal($request),
                $this->requirePath($request),
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
            if (! $file instanceof UploadedFile) {
                throw new \InvalidArgumentException('Missing upload file.');
            }

            $parent = $request->query('path');

            $result = $this->drive->handleUpload(
                $this->principal($request),
                $file,
                (string) $request->input('resumableFilename', ''),
                (string) $request->input('resumableIdentifier', ''),
                max(1, (int) $request->input('resumableChunkNumber', 1)),
                max(1, (int) $request->input('resumableTotalChunks', 1)),
                is_string($parent) && $parent !== '' ? $parent : null,
            );

            return response($result, 200)->header('Content-Type', 'text/plain; charset=utf-8');
        } catch (\InvalidArgumentException $e) {
            throw new ApiHttpException(400, $e->getMessage(), 'bad_request');
        } catch (\RuntimeException $e) {
            throw new ApiHttpException(404, $e->getMessage(), 'not_found');
        }
    }

    public function showCollaboration(Request $request): Response
    {
        $path = $this->requirePath($request);
        $request->query->set('room', $path);

        if ($request->query('format') === 'yjs') {
            $binary = $this->collabDocuments->getYjsBinary($request, $path);
            if ($binary === null) {
                return response('', 204);
            }

            return response($binary, 200, [
                'Content-Type' => 'application/octet-stream',
            ]);
        }

        return response(
            $this->collabDocuments->getMarkdown($request, $path),
            200,
            ['Content-Type' => 'text/markdown; charset=utf-8'],
        );
    }

    public function updateCollaboration(Request $request): JsonResponse
    {
        $path = $this->requirePath($request);
        $payload = $request->json()->all();
        if (! is_array($payload)) {
            $payload = [];
        }
        $payload['room'] = $path;
        $request->json()->replace($payload);

        return response()->json($this->collabDocuments->put($request, $payload));
    }

    public function star(Request $request): JsonResponse
    {
        $path = $this->requirePath($request);

        return $this->jsonData(fn () => $this->drive->updateStar(
            $this->username($request),
            $path,
            true,
        ));
    }

    public function unstar(Request $request): JsonResponse
    {
        $path = $this->requirePath($request);

        return $this->jsonData(fn () => $this->drive->updateStar(
            $this->username($request),
            $path,
            false,
        ));
    }

    public function starred(Request $request): JsonResponse
    {
        $username = $this->principal($request)['username'];
        $groupSlugs = $this->groups->allowedGroupSlugs($username);

        return $this->jsonData(fn () => [
            'paths' => $this->drive->listStarredPaths($username, $groupSlugs),
        ]);
    }

    public function resolveRoom(Request $request): JsonResponse
    {
        $path = $this->requirePath($request);

        return response()->json([
            'roomId' => $this->roomIds->encodeFilePath($path),
            'path' => $path,
        ]);
    }

    /**
     * @param  callable(): mixed  $callback
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

    private function requirePath(Request $request): string
    {
        $path = $request->query('path');
        if (! is_string($path) || trim($path) === '') {
            throw new ApiHttpException(400, 'Missing path query parameter.', 'bad_request');
        }

        return $path;
    }

    private function username(Request $request): string
    {
        return $this->principal($request)['username'];
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
}
