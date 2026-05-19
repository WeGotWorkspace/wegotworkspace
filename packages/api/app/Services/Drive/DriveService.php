<?php

declare(strict_types=1);

namespace App\Services\Drive;

use App\Models\Principal;
use App\Services\Auth\AdminRoleResolver;
use App\Storage\StoragePaths;
use App\Storage\WgwStorage;
use App\Support\WgwSettings;
use Illuminate\Contracts\Filesystem\Filesystem;
use Illuminate\Http\UploadedFile;
use Symfony\Component\HttpFoundation\StreamedResponse;

final class DriveService
{
    public function __construct(
        private WgwStorage $storage,
        private StoragePaths $paths,
        private DriveGroupResolver $groups,
        private DriveSessionStore $session,
        private DriveStarService $stars,
        private AdminRoleResolver $adminRoles,
    ) {
    }

    public function assertFilesEnabled(): void
    {
        $cfg = WgwSettings::normalized();
        if (! (bool) ($cfg[WgwSettings::FILES_ENABLED] ?? true)) {
            throw new \RuntimeException('WebDAV files are disabled for this site.');
        }
    }

    /**
     * @return array{username: string, name: string, role: string, roots: list<string>}
     */
    public function userContext(string $username): array
    {
        $this->assertFilesEnabled();
        $principal = Principal::query()->where('uri', 'principals/'.$username)->first();

        return [
            'username' => $username,
            'name' => (string) ($principal?->displayname ?: $username),
            'role' => $this->adminRoles->isAdmin($username) ? 'admin' : 'user',
            'roots' => ['/users', '/groups'],
        ];
    }

    /**
     * @return array{location: string, files: list<array{type: string, path: string, name: string, size: int, time: int, permissions: int}>}
     */
    public function listDirectory(string $username, string $dir): array
    {
        $this->assertFilesEnabled();
        $groupSlugs = $this->groups->allowedGroupSlugs($username);
        $dir = $this->paths->normalizeVirtualPath($dir);
        $this->assertAllowed($dir, $username, $groupSlugs, false);
        $this->session->setCwd($dir);

        return [
            'location' => $this->withTrailingSlash($dir),
            'files' => $this->listEntries($dir, $username, $groupSlugs, false, null),
        ];
    }

    /**
     * @return array{location: string, files: list<array{type: string, path: string, name: string, size: int, time: int, permissions: int}>}
     */
    public function search(string $username, string $query, int $limit): array
    {
        $this->assertFilesEnabled();
        $groupSlugs = $this->groups->allowedGroupSlugs($username);
        $query = trim($query);
        if ($query === '' || mb_strlen($query) < 2) {
            return ['location' => '/', 'files' => []];
        }

        return [
            'location' => '/',
            'files' => array_slice(
                $this->listEntries('/', $username, $groupSlugs, true, $query),
                0,
                max(1, min(100, $limit))
            ),
        ];
    }

    /**
     * @return array{cwd: string}
     */
    public function changeDirectory(string $username, string $to): array
    {
        $this->assertFilesEnabled();
        $groupSlugs = $this->groups->allowedGroupSlugs($username);
        $to = $this->paths->normalizeVirtualPath($to);
        if (! $this->paths->isPathAllowed($to, $username, $groupSlugs, false)) {
            $to = '/';
        }
        $this->session->setCwd($to);

        return ['cwd' => $to];
    }

    public function createItem(
        string $username,
        string $name,
        string $type,
        ?string $cwd,
    ): string {
        $this->assertFilesEnabled();
        $groupSlugs = $this->groups->allowedGroupSlugs($username);
        $name = $this->validateItemName($name);
        if ($type !== 'dir' && $type !== 'file') {
            throw new \InvalidArgumentException('Invalid item type. Use "dir" or "file".');
        }

        $parent = $this->session->resolveCwd($cwd, $username, $groupSlugs);
        $newPath = $this->paths->normalizeVirtualPath($parent.'/'.$name);
        $this->assertAllowed($newPath, $username, $groupSlugs, true);

        $disk = $this->disk();
        $key = $this->paths->virtualToStorageKey($newPath);
        if ($disk->exists($key)) {
            throw new \InvalidArgumentException('Item already exists.');
        }

        if ($type === 'dir') {
            if (! $disk->makeDirectory($key)) {
                throw new \RuntimeException('Could not create folder.');
            }
        } else {
            $disk->put($key, '');
        }

        return 'Created';
    }

    public function renameItem(
        string $username,
        string $destination,
        string $from,
        string $toName,
    ): string {
        $this->assertFilesEnabled();
        $groupSlugs = $this->groups->allowedGroupSlugs($username);
        $destination = $this->paths->normalizeVirtualPath($destination);
        $toName = $this->validateItemName($toName);
        $fromPath = str_contains($from, '/')
            ? $this->paths->normalizeVirtualPath($from)
            : $this->paths->normalizeVirtualPath($destination.'/'.$this->validateItemName($from));
        $toPath = $this->paths->normalizeVirtualPath($destination.'/'.$toName);

        $this->assertAllowed($fromPath, $username, $groupSlugs, true);
        $this->assertAllowed($toPath, $username, $groupSlugs, true);

        $disk = $this->disk();
        $fromKey = $this->paths->virtualToStorageKey($fromPath);
        $toKey = $this->paths->virtualToStorageKey($toPath);
        if (! $disk->exists($fromKey)) {
            throw new \InvalidArgumentException('Source not found.');
        }
        if ($disk->exists($toKey)) {
            throw new \InvalidArgumentException('Destination already exists.');
        }
        if (! $disk->move($fromKey, $toKey)) {
            throw new \RuntimeException('Rename failed.');
        }

        return 'Renamed';
    }

    /**
     * @param list<array{path?: string, type?: string}> $items
     */
    public function deleteItems(string $username, array $items): string
    {
        $this->assertFilesEnabled();
        $groupSlugs = $this->groups->allowedGroupSlugs($username);
        $disk = $this->disk();

        foreach ($items as $item) {
            if (! is_array($item)) {
                continue;
            }
            $path = $this->paths->normalizeVirtualPath((string) ($item['path'] ?? '/'));
            $this->assertAllowed($path, $username, $groupSlugs, true);
            $key = $this->paths->virtualToStorageKey($path);
            if ($disk->directoryExists($key)) {
                $disk->deleteDirectory($key);
            } elseif ($disk->exists($key)) {
                $disk->delete($key);
            }
        }

        return 'Deleted';
    }

    /**
     * @param list<string> $groupSlugs
     *
     * @return list<string>
     */
    public function listStarredPaths(string $username, array $groupSlugs): array
    {
        $this->assertFilesEnabled();

        return $this->stars->listPaths($username, $groupSlugs);
    }

    public function updateStar(string $username, string $path, bool $starred): string
    {
        $this->assertFilesEnabled();
        $groupSlugs = $this->groups->allowedGroupSlugs($username);
        $path = $this->paths->normalizeVirtualPath($path);
        $this->assertAllowed($path, $username, $groupSlugs, false);
        $this->stars->setStarred($username, $path, $starred);

        return 'Updated';
    }

    public function downloadResponse(string $username, string $encodedPath): StreamedResponse
    {
        $this->assertFilesEnabled();
        $groupSlugs = $this->groups->allowedGroupSlugs($username);
        $decoded = base64_decode($encodedPath, true);
        if (! is_string($decoded) || $decoded === '') {
            throw new \InvalidArgumentException('Invalid download path.');
        }

        $virtual = $this->paths->normalizeVirtualPath($decoded);
        $this->assertAllowed($virtual, $username, $groupSlugs, false);

        $disk = $this->disk();
        $key = $this->paths->virtualToStorageKey($virtual);
        if (! $disk->fileExists($key)) {
            throw new \InvalidArgumentException('File not found.');
        }

        $name = basename($virtual);
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
        string $username,
        UploadedFile $file,
        string $filename,
        string $identifier,
        int $chunkNumber,
        int $totalChunks,
        ?string $cwd,
    ): string {
        $this->assertFilesEnabled();
        $groupSlugs = $this->groups->allowedGroupSlugs($username);
        $filename = $this->validateItemName($filename);
        $identifier = preg_replace('/[^0-9A-Za-z_]/', '_', $identifier) ?? '';
        $chunkNumber = max(1, $chunkNumber);
        $totalChunks = max(1, $totalChunks);

        $parent = $this->session->resolveCwd($cwd, $username, $groupSlugs);
        $targetVirtual = $this->paths->normalizeVirtualPath($parent.'/'.$filename);
        $this->assertAllowed($targetVirtual, $username, $groupSlugs, true);

        $disk = $this->disk();
        $targetKey = $this->paths->virtualToStorageKey($targetVirtual);

        if ($totalChunks <= 1) {
            $disk->put($targetKey, $file->get());

            return 'Stored';
        }

        $tempDisk = $this->storage->data();
        $partKey = 'drive-upload-temp/'.hash('sha256', $identifier.'|'.$filename.'|'.$targetVirtual).'.part';
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

    /**
     * @param list<string> $groupSlugs
     *
     * @return list<array{type: string, path: string, name: string, size: int, time: int, permissions: int}>
     */
    private function listEntries(
        string $virtualDir,
        string $username,
        array $groupSlugs,
        bool $recursive,
        ?string $nameQuery,
    ): array {
        $disk = $this->disk();
        $query = $nameQuery !== null ? mb_strtolower($nameQuery) : null;

        if ($virtualDir === '/' && ! $recursive) {
            $out = [];
            foreach (['/users', '/groups'] as $root) {
                if (! $this->paths->isPathAllowed($root, $username, $groupSlugs, false)) {
                    continue;
                }
                $key = ltrim($root, '/');
                if (! $disk->directoryExists($key)) {
                    continue;
                }
                $out[] = $this->serializeEntry($root, true, 0, (int) ($disk->lastModified($key) ?? time()));
            }

            return $this->sortEntries($out);
        }

        $prefix = $this->paths->virtualToStorageKey($virtualDir);
        if ($prefix !== '' && ! $disk->directoryExists($prefix)) {
            return [];
        }

        if ($recursive) {
            return $this->searchRecursive($disk, $username, $groupSlugs, $query);
        }

        $out = [];
        $dirPrefix = $prefix === '' ? '' : rtrim($prefix, '/').'/';
        foreach ($disk->directories($prefix) as $dirKey) {
            $virt = $this->paths->normalizeVirtualPath('/'.$dirKey);
            if (! $this->paths->isPathAllowed($virt, $username, $groupSlugs, false)) {
                continue;
            }
            if ($this->isHiddenNotesPath($virt)) {
                continue;
            }
            $out[] = $this->serializeEntry($virt, true, 0, (int) ($disk->lastModified($dirKey) ?? time()));
        }
        foreach ($disk->files($prefix) as $fileKey) {
            $virt = $this->paths->normalizeVirtualPath('/'.$fileKey);
            if (! $this->paths->isPathAllowed($virt, $username, $groupSlugs, false)) {
                continue;
            }
            if ($this->isHiddenNotesPath($virt)) {
                continue;
            }
            $out[] = $this->serializeEntry(
                $virt,
                false,
                (int) ($disk->size($fileKey) ?? 0),
                (int) ($disk->lastModified($fileKey) ?? time())
            );
        }

        return $this->sortEntries($out);
    }

    /**
     * @param list<string> $groupSlugs
     *
     * @return list<array{type: string, path: string, name: string, size: int, time: int, permissions: int}>
     */
    private function searchRecursive(
        Filesystem $disk,
        string $username,
        array $groupSlugs,
        ?string $query,
    ): array {
        $out = [];
        foreach ($disk->allFiles() as $fileKey) {
            $virt = $this->paths->normalizeVirtualPath('/'.$fileKey);
            if (! $this->paths->isPathAllowed($virt, $username, $groupSlugs, false)) {
                continue;
            }
            if ($this->isHiddenNotesPath($virt)) {
                continue;
            }
            $name = basename($virt);
            if ($query !== null && ! str_contains(mb_strtolower($name), $query)) {
                continue;
            }
            $isDir = false;
            $out[] = $this->serializeEntry(
                $virt,
                $isDir,
                (int) ($disk->size($fileKey) ?? 0),
                (int) ($disk->lastModified($fileKey) ?? time())
            );
            if (count($out) >= 400) {
                break;
            }
        }

        foreach ($disk->allDirectories() as $dirKey) {
            $virt = $this->paths->normalizeVirtualPath('/'.$dirKey);
            if (! $this->paths->isPathAllowed($virt, $username, $groupSlugs, false)) {
                continue;
            }
            if ($this->isHiddenNotesPath($virt)) {
                continue;
            }
            $name = basename($virt);
            if ($query !== null && ! str_contains(mb_strtolower($name), $query)) {
                continue;
            }
            $out[] = $this->serializeEntry($virt, true, 0, (int) ($disk->lastModified($dirKey) ?? time()));
            if (count($out) >= 400) {
                break;
            }
        }

        if ($query !== null) {
            usort(
                $out,
                static function (array $a, array $b) use ($query): int {
                    $ap = str_starts_with(mb_strtolower($a['name']), $query) ? 0 : 1;
                    $bp = str_starts_with(mb_strtolower($b['name']), $query) ? 0 : 1;
                    if ($ap !== $bp) {
                        return $ap <=> $bp;
                    }
                    if ($a['type'] !== $b['type']) {
                        return $a['type'] === 'dir' ? -1 : 1;
                    }

                    return strnatcasecmp($a['name'], $b['name']);
                }
            );
        }

        return $out;
    }

    /**
     * @param list<array{type: string, path: string, name: string, size: int, time: int, permissions: int}> $entries
     *
     * @return list<array{type: string, path: string, name: string, size: int, time: int, permissions: int}>
     */
    private function sortEntries(array $entries): array
    {
        usort(
            $entries,
            static function (array $a, array $b): int {
                if ($a['type'] !== $b['type']) {
                    return $a['type'] === 'dir' ? -1 : 1;
                }

                return strnatcasecmp($a['name'], $b['name']);
            }
        );

        return $entries;
    }

    /**
     * @return array{type: string, path: string, name: string, size: int, time: int, permissions: int}
     */
    private function serializeEntry(string $virtualPath, bool $isDir, int $size, int $time): array
    {
        $path = $this->paths->normalizeVirtualPath($virtualPath);

        return [
            'type' => $isDir ? 'dir' : 'file',
            'path' => $path,
            'name' => basename($path),
            'size' => max(0, $size),
            'time' => max(0, $time),
            'permissions' => 0,
        ];
    }

    /**
     * @param list<string> $groupSlugs
     */
    private function assertAllowed(string $virtualPath, string $username, array $groupSlugs, bool $forWrite): void
    {
        if (! $this->paths->isPathAllowed($virtualPath, $username, $groupSlugs, $forWrite)) {
            throw new \InvalidArgumentException('Access denied for this path.');
        }
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

    private function withTrailingSlash(string $virtualPath): string
    {
        $path = $this->paths->normalizeVirtualPath($virtualPath);

        return $path === '/' ? '/' : $path.'/';
    }

    private function isHiddenNotesPath(string $virtualPath): bool
    {
        return preg_match('#/(?:users|groups)/[^/]+/\.notes(?:/|$)#', $virtualPath) === 1;
    }

    private function disk(): Filesystem
    {
        return $this->storage->files();
    }
}
