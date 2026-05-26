<?php

declare(strict_types=1);

namespace App\Services\Collab;

use App\Services\Drive\DriveGroupResolver;
use App\Storage\StoragePaths;
use App\Storage\WgwStorage;
use App\Support\WgwSettings;
use Illuminate\Http\Request;

/**
 * Markdown + Yjs sidecar persistence on the drive files disk.
 *
 * Sidecar convention: {documentPath}.yjs next to {documentPath} (.md or .txt).
 */
final class DocCollabDocumentService
{
    private const DEFAULT_MARKDOWN = "# Collaborative document\n\nStart typing…\n";

    private const MAX_MARKDOWN_BYTES = 2_097_152;

    private const MAX_YJS_BYTES = 5_242_880;

    public function __construct(
        private CollabActorResolver $actors,
        private CollabRoomPolicy $rooms,
        private WgwStorage $storage,
        private StoragePaths $paths,
        private DriveGroupResolver $groups,
    ) {}

    public function getMarkdown(Request $request, mixed $room): string
    {
        $virtual = $this->resolveReadablePath($request, $room);
        $key = $this->paths->virtualToStorageKey($virtual);
        $disk = $this->storage->files();
        if (! $disk->fileExists($key)) {
            return self::DEFAULT_MARKDOWN;
        }

        $contents = $disk->get($key);
        if (! is_string($contents) || $contents === '') {
            return self::DEFAULT_MARKDOWN;
        }

        return $contents;
    }

    /**
     * @return non-empty-string|null null when sidecar is missing or empty
     */
    public function getYjsBinary(Request $request, mixed $room): ?string
    {
        $virtual = $this->resolveReadablePath($request, $room);
        $key = $this->paths->virtualToStorageKey($this->yjsSidecarPath($virtual));
        $disk = $this->storage->files();
        if (! $disk->fileExists($key)) {
            return null;
        }

        $size = (int) ($disk->size($key) ?? 0);
        if ($size <= 0) {
            return null;
        }

        $contents = $disk->get($key);
        if (! is_string($contents) || $contents === '') {
            return null;
        }

        return $contents;
    }

    /**
     * @param  array<string, mixed>  $body
     * @return array{ok: true}
     */
    public function put(Request $request, array $body): array
    {
        $virtual = $this->resolveWritablePath($request, $body['room'] ?? null);
        $hasMarkdown = array_key_exists('markdown', $body);
        $hasYjs = array_key_exists('yjs', $body);
        if (! $hasMarkdown && ! $hasYjs) {
            $this->fail('nothing_to_save');
        }

        $disk = $this->storage->files();
        if ($hasMarkdown) {
            if (! is_string($body['markdown'])) {
                $this->fail('invalid_markdown');
            }
            $markdown = $body['markdown'];
            if (strlen($markdown) > self::MAX_MARKDOWN_BYTES) {
                $this->fail('markdown_too_large', 413);
            }
            $disk->put($this->paths->virtualToStorageKey($virtual), $markdown);
        }

        if ($hasYjs) {
            $bytes = $this->decodeYjsBytes($body['yjs']);
            if (strlen($bytes) > self::MAX_YJS_BYTES) {
                $this->fail('yjs_too_large', 413);
            }
            $disk->put($this->paths->virtualToStorageKey($this->yjsSidecarPath($virtual)), $bytes);
        }

        return ['ok' => true];
    }

    private function yjsSidecarPath(string $documentVirtualPath): string
    {
        return $this->paths->normalizeVirtualPath($documentVirtualPath.'.yjs');
    }

    private function resolveReadablePath(Request $request, mixed $room): string
    {
        $this->assertFilesEnabled();
        $username = $this->actors->requireUsername($request);
        $groupSlugs = $this->groups->allowedGroupSlugs($username);
        $virtual = $this->paths->normalizeVirtualPath($this->rooms->cleanDocumentPath($room));
        $this->assertAllowed($virtual, $username, $groupSlugs, false);

        return $virtual;
    }

    private function resolveWritablePath(Request $request, mixed $room): string
    {
        $this->assertFilesEnabled();
        $username = $this->actors->requireUsername($request);
        $groupSlugs = $this->groups->allowedGroupSlugs($username);
        $virtual = $this->paths->normalizeVirtualPath($this->rooms->cleanDocumentPath($room));
        $this->assertAllowed($virtual, $username, $groupSlugs, true);

        return $virtual;
    }

    /**
     * @param  list<mixed>|mixed  $yjs
     */
    private function decodeYjsBytes(mixed $yjs): string
    {
        if (! is_array($yjs)) {
            $this->fail('invalid_yjs');
        }

        $bytes = '';
        foreach ($yjs as $byte) {
            if (! is_int($byte) || $byte < 0 || $byte > 255) {
                $this->fail('invalid_yjs');
            }
            $bytes .= chr($byte);
        }

        return $bytes;
    }

    /**
     * @param  list<string>  $groupSlugs
     */
    private function assertAllowed(string $virtualPath, string $username, array $groupSlugs, bool $forWrite): void
    {
        if (! $this->paths->isPathAllowed($virtualPath, $username, $groupSlugs, $forWrite)) {
            $this->fail('forbidden', 403);
        }
    }

    private function assertFilesEnabled(): void
    {
        $cfg = WgwSettings::normalized();
        if (! (bool) ($cfg[WgwSettings::FILES_ENABLED] ?? true)) {
            $this->fail('files_disabled', 503, 'WebDAV files are disabled for this site.');
        }
    }

    private function fail(string $error, int $status = 400, ?string $message = null): never
    {
        $payload = ['error' => $error];
        if ($message !== null) {
            $payload['message'] = $message;
        }
        throw new CollabResponseException($status, $payload);
    }
}
