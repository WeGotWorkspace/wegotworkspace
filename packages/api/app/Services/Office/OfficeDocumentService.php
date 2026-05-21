<?php

declare(strict_types=1);

namespace App\Services\Office;

use App\Services\Drive\DriveGroupResolver;
use App\Storage\StoragePaths;
use App\Storage\WgwStorage;
use App\Support\WgwSettings;

final class OfficeDocumentService
{
    public function __construct(
        private WgwStorage $storage,
        private StoragePaths $paths,
        private DriveGroupResolver $groups,
    ) {}

    public function assertFilesEnabled(): void
    {
        $cfg = WgwSettings::normalized();
        if (! (bool) ($cfg[WgwSettings::FILES_ENABLED] ?? true)) {
            throw new \RuntimeException('WebDAV files are disabled for this site.');
        }
    }

    /**
     * @param  array<string, mixed>  $body
     * @return array{ok: bool, path: string, bytes: int}
     */
    public function create(string $username, array $body): array
    {
        return $this->upsert($username, $body, true);
    }

    /**
     * @param  array<string, mixed>  $body
     * @return array{ok: bool, path: string, bytes: int}
     */
    public function update(string $username, array $body): array
    {
        return $this->upsert($username, $body, false);
    }

    /**
     * @param  array<string, mixed>  $body
     * @return array{ok: bool, path: string, bytes: int}
     */
    private function upsert(string $username, array $body, bool $create): array
    {
        $this->assertFilesEnabled();

        $pathRaw = isset($body['path']) && is_string($body['path']) ? trim($body['path']) : '';
        if ($pathRaw === '') {
            throw new \InvalidArgumentException('path is required.');
        }

        $path = $this->paths->normalizeVirtualPath($pathRaw);
        if (! preg_match('#^/(?:users|groups)/[^/]+/.+#', $path)) {
            throw new \InvalidArgumentException('path must target users/* or groups/* storage.');
        }

        $ext = strtolower((string) pathinfo($path, PATHINFO_EXTENSION));
        if (! in_array($ext, ['docx', 'xlsx', 'pptx'], true)) {
            throw new \InvalidArgumentException('Only .docx, .xlsx, and .pptx are supported.');
        }

        $groupSlugs = $this->groups->allowedGroupSlugs($username);
        if (! $this->paths->isPathAllowed($path, $username, $groupSlugs, true)) {
            throw new \InvalidArgumentException('Access denied for this path.');
        }

        $disk = $this->storage->files();
        $key = $this->paths->virtualToStorageKey($path);

        $contentBase64 = isset($body['content_base64']) && is_string($body['content_base64'])
            ? trim($body['content_base64'])
            : '';

        if ($create && $disk->exists($key)) {
            throw new \InvalidArgumentException('Document already exists.');
        }
        if (! $create && ! $disk->fileExists($key)) {
            throw new \InvalidArgumentException('Document not found.');
        }
        if (! $create && $contentBase64 === '') {
            throw new \InvalidArgumentException('content_base64 is required when updating.');
        }

        $bytes = '';
        if ($contentBase64 !== '') {
            $decoded = base64_decode($contentBase64, true);
            if (! is_string($decoded)) {
                throw new \InvalidArgumentException('content_base64 is invalid.');
            }
            $bytes = $decoded;
        }

        if (! $disk->put($key, $bytes)) {
            throw new \RuntimeException('Could not save document.');
        }

        return [
            'ok' => true,
            'path' => $path,
            'bytes' => strlen($bytes),
        ];
    }
}
