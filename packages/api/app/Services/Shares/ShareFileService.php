<?php

declare(strict_types=1);

namespace App\Services\Shares;

use App\Storage\StoragePaths;
use App\Storage\WgwStorage;
use Illuminate\Http\UploadedFile;
use Symfony\Component\HttpFoundation\StreamedResponse;

/**
 * Recipient-side file operations for a resolved share. Paths are interpreted
 * relative to the share's target, with a strict containment check blocking any
 * traversal outside the target. Access is governed entirely by the share
 * (already resolved), so this intentionally bypasses the per-user drive ACL.
 */
final class ShareFileService
{
    public function __construct(
        private WgwStorage $storage,
        private StoragePaths $paths,
        private ShareAvailability $availability,
    ) {}

    /**
     * @return array{location: string, files: list<array{type: string, path: string, name: string, size: int, time: int}>}
     */
    public function listChildren(ResolvedShareAccess $access, string $relPath): array
    {
        $this->availability->assertEnabled();
        if (! $access->isDirectory()) {
            throw new \InvalidArgumentException('This share is a single file.');
        }

        $target = $this->paths->normalizeVirtualPath($access->targetPath);
        $full = $this->resolveWithin($access, $relPath);
        $disk = $this->storage->files();
        $prefix = $this->paths->virtualToStorageKey($full);
        if ($prefix !== '' && ! $disk->directoryExists($prefix)) {
            throw new \RuntimeException('Directory not found.');
        }

        $entries = [];
        foreach ($disk->directories($prefix) as $dirKey) {
            $virt = $this->paths->normalizeVirtualPath('/'.$dirKey);
            if ($this->isHiddenNotesPath($virt)) {
                continue;
            }
            $entries[] = $this->serializeEntry($target, $virt, true, 0, (int) ($disk->lastModified($dirKey) ?? time()));
        }
        foreach ($disk->files($prefix) as $fileKey) {
            $virt = $this->paths->normalizeVirtualPath('/'.$fileKey);
            if ($this->isHiddenNotesPath($virt)) {
                continue;
            }
            $entries[] = $this->serializeEntry(
                $target,
                $virt,
                false,
                (int) ($disk->size($fileKey) ?? 0),
                (int) ($disk->lastModified($fileKey) ?? time()),
            );
        }

        usort(
            $entries,
            static function (array $a, array $b): int {
                if ($a['type'] !== $b['type']) {
                    return $a['type'] === 'dir' ? -1 : 1;
                }

                return strnatcasecmp($a['name'], $b['name']);
            }
        );

        return [
            'location' => $this->relativePath($target, $full),
            'files' => $entries,
        ];
    }

    public function downloadResponse(ResolvedShareAccess $access, string $relPath): StreamedResponse
    {
        $this->availability->assertEnabled();
        $full = $this->resolveWithin($access, $relPath);
        $disk = $this->storage->files();
        $key = $this->paths->virtualToStorageKey($full);
        if (! $disk->fileExists($key)) {
            throw new \RuntimeException('File not found.');
        }

        $name = basename($full);
        $mime = $disk->mimeType($key) ?: 'application/octet-stream';

        return response()->streamDownload(
            static function () use ($disk, $key): void {
                $stream = $disk->readStream($key);
                if (! is_resource($stream)) {
                    return;
                }
                fpassthru($stream);
                fclose($stream);
            },
            $name,
            [
                'Content-Type' => $mime,
                'Content-Disposition' => 'inline; filename="'.str_replace('"', '', $name).'"',
            ]
        );
    }

    public function handleUpload(
        ResolvedShareAccess $access,
        ?string $parentRelPath,
        UploadedFile $file,
        string $filename,
        string $identifier,
        int $chunkNumber,
        int $totalChunks,
    ): string {
        $this->availability->assertEnabled();
        $this->assertWritable($access);
        $filename = $this->validateItemName($filename);

        $targetVirtual = $this->uploadTargetPath($access, $parentRelPath, $filename);
        $disk = $this->storage->files();
        $targetKey = $this->paths->virtualToStorageKey($targetVirtual);

        $chunkNumber = max(1, $chunkNumber);
        $totalChunks = max(1, $totalChunks);
        if ($totalChunks <= 1) {
            $disk->put($targetKey, $file->get());

            return 'Stored';
        }

        $identifier = preg_replace('/[^0-9A-Za-z_]/', '_', $identifier) ?? '';
        $tempDisk = $this->storage->data();
        $partKey = 'share-upload-temp/'.hash('sha256', $identifier.'|'.$filename.'|'.$targetVirtual).'.part';
        $chunk = $file->get();
        if ($chunkNumber === 1) {
            $tempDisk->put($partKey, $chunk);
        } else {
            $existing = $tempDisk->exists($partKey) ? $tempDisk->get($partKey) : '';
            $tempDisk->put($partKey, $existing.$chunk);
        }

        if ($chunkNumber < $totalChunks) {
            return 'Uploaded';
        }

        $disk->put($targetKey, $tempDisk->get($partKey));
        $tempDisk->delete($partKey);

        return 'Stored';
    }

    public function makeDirectory(ResolvedShareAccess $access, ?string $parentRelPath, string $name): string
    {
        $this->availability->assertEnabled();
        $this->assertWritable($access);
        if (! $access->isDirectory()) {
            throw new \InvalidArgumentException('This share is a single file.');
        }
        $name = $this->validateItemName($name);

        $parentFull = $this->resolveWithin($access, $parentRelPath ?? '');
        $newPath = $this->paths->normalizeVirtualPath($parentFull.'/'.$name);
        $this->assertContained($access, $newPath);

        $disk = $this->storage->files();
        $key = $this->paths->virtualToStorageKey($newPath);
        if ($disk->directoryExists($key) || $disk->fileExists($key)) {
            throw new \InvalidArgumentException('Item already exists.');
        }
        $disk->makeDirectory($key);

        return 'Created';
    }

    private function uploadTargetPath(ResolvedShareAccess $access, ?string $parentRelPath, string $filename): string
    {
        if (! $access->isDirectory()) {
            // Single-file share: writes overwrite the target file itself.
            return $this->paths->normalizeVirtualPath($access->targetPath);
        }

        $parentFull = $this->resolveWithin($access, $parentRelPath ?? '');
        $target = $this->paths->normalizeVirtualPath($parentFull.'/'.$filename);
        $this->assertContained($access, $target);

        return $target;
    }

    /**
     * Map a share-relative path onto the target and enforce containment.
     */
    private function resolveWithin(ResolvedShareAccess $access, string $rel): string
    {
        $target = $this->paths->normalizeVirtualPath($access->targetPath);
        if (! $access->isDirectory()) {
            return $target;
        }

        $full = $this->paths->normalizeVirtualPath($target.'/'.$rel);
        $this->assertContained($access, $full);
        if ($this->isHiddenNotesPath($full)) {
            throw new \InvalidArgumentException('Access denied for this path.');
        }

        return $full;
    }

    private function assertContained(ResolvedShareAccess $access, string $full): void
    {
        $target = $this->paths->normalizeVirtualPath($access->targetPath);
        if ($full !== $target && ! str_starts_with($full, rtrim($target, '/').'/')) {
            throw new \InvalidArgumentException('Path escapes the share.');
        }
    }

    private function assertWritable(ResolvedShareAccess $access): void
    {
        if (! $access->canWrite()) {
            throw new \InvalidArgumentException('This share is read-only.');
        }
    }

    /**
     * @return array{type: string, path: string, name: string, size: int, time: int}
     */
    private function serializeEntry(string $target, string $virtualPath, bool $isDir, int $size, int $time): array
    {
        return [
            'type' => $isDir ? 'dir' : 'file',
            'path' => $this->relativePath($target, $virtualPath),
            'name' => basename($virtualPath),
            'size' => max(0, $size),
            'time' => max(0, $time),
        ];
    }

    private function relativePath(string $target, string $full): string
    {
        $target = $this->paths->normalizeVirtualPath($target);
        $full = $this->paths->normalizeVirtualPath($full);
        if ($full === $target) {
            return '/';
        }
        $rel = substr($full, strlen(rtrim($target, '/')));

        return $rel === '' ? '/' : $rel;
    }

    private function validateItemName(string $name): string
    {
        $name = trim($name);
        if (
            $name === ''
            || $name === '.'
            || $name === '..'
            || str_contains($name, '/')
            || str_contains($name, '\\')
            || str_contains($name, "\0")
        ) {
            throw new \InvalidArgumentException('Invalid item name.');
        }

        return $name;
    }

    private function isHiddenNotesPath(string $virtualPath): bool
    {
        return preg_match('#/(?:users|groups)/[^/]+/\.notes(?:/|$)#', $virtualPath) === 1;
    }
}
