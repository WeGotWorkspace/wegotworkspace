<?php

declare(strict_types=1);

namespace App\Services\Notes;

use App\Exceptions\ApiHttpException;
use App\Services\Search\SearchIndexerService;
use App\Storage\NoteStoragePaths;
use App\Storage\WgwStorage;
use Illuminate\Contracts\Filesystem\Filesystem;
use Illuminate\Database\QueryException;

final class NoteRepository
{
    public function __construct(
        private WgwStorage $storage,
        private NoteStoragePaths $notePaths,
        private NoteMarkdownCodec $codec,
        private SearchIndexerService $searchIndexer,
    ) {}

    /**
     * @param  array<string, mixed>  $params
     * @return array{items: list<array<string, mixed>>}
     */
    public function list(string $username, array $params): array
    {
        $archived = $this->codec->toBool($params['archived'] ?? null);
        $notebookFilter = isset($params['notebook']) && is_string($params['notebook'])
            ? trim($params['notebook'])
            : '';
        $q = isset($params['q']) && is_string($params['q']) ? strtolower(trim($params['q'])) : '';

        $items = [];
        foreach ($this->readAll($username) as $note) {
            if ($archived !== null && $note['archived'] !== $archived) {
                continue;
            }
            if ($notebookFilter !== '' && $note['notebook'] !== $notebookFilter) {
                continue;
            }
            if (
                $q !== ''
                && ! str_contains(strtolower((string) $note['title']), $q)
                && ! str_contains(strtolower((string) $note['body']), $q)
                && ! str_contains(strtolower(implode(',', $note['tags'])), $q)
            ) {
                continue;
            }
            $items[] = $note;
        }

        usort(
            $items,
            static fn (array $a, array $b): int => strcmp((string) ($b['updatedAt'] ?? ''), (string) ($a['updatedAt'] ?? ''))
        );

        return ['items' => array_values($items)];
    }

    /**
     * @param  array<string, mixed>  $body
     * @return array{ok: true, item: array<string, mixed>}
     */
    public function upsert(string $username, ?string $pathId, array $body): array
    {
        $id = $pathId !== null
            ? $this->sanitizeNoteId($pathId)
            : $this->sanitizeNoteId((string) ($body['id'] ?? ('n'.(string) time())));
        $notebook = $this->sanitizeNotebook((string) ($body['notebook'] ?? 'General'));
        $archived = $this->codec->toBool($body['archived'] ?? false) ?? false;
        $title = trim((string) ($body['title'] ?? 'Untitled'));
        $tags = $this->codec->normalizeTags($body['tags'] ?? []);
        $bodyText = (string) ($body['body'] ?? '');
        $starred = $this->codec->toBool($body['starred'] ?? null);
        $key = $this->notePaths->noteKey($username, $notebook, $id, $archived);
        $disk = $this->disk();
        $disk->makeDirectory(dirname($key));
        $markdown = $this->codec->serialize($title !== '' ? $title : 'Untitled', $tags, $starred, $bodyText);
        if (! $disk->put($key, $markdown)) {
            throw new ApiHttpException(500, 'Could not save note.', 'server_error');
        }
        $this->syncSearchIndex(fn () => $this->searchIndexer->indexFileStorageKey($key));

        return [
            'ok' => true,
            'item' => $this->readAt($key, $username, $notebook, $id, $archived),
        ];
    }

    /**
     * @param  array<string, mixed>  $body
     * @return array{ok: true}
     */
    public function delete(string $username, string $id, array $body): array
    {
        $noteId = $this->sanitizeNoteId($id);
        $notebook = isset($body['notebook']) && is_string($body['notebook'])
            ? $this->sanitizeNotebook($body['notebook'])
            : null;
        $archived = $this->codec->toBool($body['archived'] ?? null);
        $location = $this->findNoteKey($username, $noteId, $notebook, $archived);
        if ($location === null) {
            throw new ApiHttpException(400, 'Note not found.', 'bad_request');
        }
        if (! $this->disk()->delete($location['key'])) {
            throw new ApiHttpException(500, 'Could not delete note.', 'server_error');
        }
        $this->syncSearchIndex(fn () => $this->searchIndexer->deleteDavPath('files/'.$location['key']));

        return ['ok' => true];
    }

    /**
     * @return array{ok: true, item: array<string, mixed>}
     */
    public function setArchived(string $username, string $id, bool $toArchived): array
    {
        $noteId = $this->sanitizeNoteId($id);
        $from = $this->findNoteKey($username, $noteId, null, ! $toArchived);
        if ($from === null) {
            throw new ApiHttpException(400, 'Note not found.', 'bad_request');
        }
        $toKey = $this->notePaths->noteKey($username, $from['notebook'], $noteId, $toArchived);
        $disk = $this->disk();
        $disk->makeDirectory(dirname($toKey));
        if ($disk->exists($toKey)) {
            throw new ApiHttpException(400, 'Note already exists in target location.', 'bad_request');
        }
        if (! $disk->move($from['key'], $toKey)) {
            throw new ApiHttpException(500, 'Could not move note.', 'server_error');
        }
        $this->syncSearchIndex(fn () => $this->searchIndexer->deleteDavPath('files/'.$from['key']));
        $this->syncSearchIndex(fn () => $this->searchIndexer->indexFileStorageKey($toKey));

        return [
            'ok' => true,
            'item' => $this->readAt($toKey, $username, $from['notebook'], $noteId, $toArchived),
        ];
    }

    /**
     * @return array{items: list<array{name: string, activeCount: int, archivedCount: int}>}
     */
    public function listNotebooks(string $username): array
    {
        $byName = [];
        foreach ($this->readAll($username) as $item) {
            $name = (string) ($item['notebook'] ?? '');
            if ($name === '') {
                continue;
            }
            if (! isset($byName[$name])) {
                $byName[$name] = ['name' => $name, 'activeCount' => 0, 'archivedCount' => 0];
            }
            if (($item['archived'] ?? false) === true) {
                $byName[$name]['archivedCount']++;
            } else {
                $byName[$name]['activeCount']++;
            }
        }
        ksort($byName);

        return ['items' => array_values($byName)];
    }

    /**
     * @param  array<string, mixed>  $body
     * @return array{ok: true, name: string}
     */
    public function createNotebook(string $username, array $body): array
    {
        $name = $this->sanitizeNotebook((string) ($body['name'] ?? ''));
        $key = $this->notePaths->notebookKey($username, $name, false);
        if ($this->disk()->directoryExists($key)) {
            throw new ApiHttpException(400, 'Notebook already exists.', 'bad_request');
        }
        if (! $this->disk()->makeDirectory($key)) {
            throw new ApiHttpException(500, 'Could not create notebook.', 'server_error');
        }

        return ['ok' => true, 'name' => $name];
    }

    /**
     * @param  array<string, mixed>  $body
     * @return array{ok: true, from: string, to: string}
     */
    public function renameNotebook(string $username, string $name, array $body): array
    {
        $from = $this->sanitizeNotebook($name);
        $to = $this->sanitizeNotebook((string) ($body['name'] ?? ''));
        if ($from === $to) {
            return ['ok' => true, 'from' => $from, 'to' => $to];
        }
        foreach ([false, true] as $archived) {
            $source = $this->notePaths->notebookKey($username, $from, $archived);
            $target = $this->notePaths->notebookKey($username, $to, $archived);
            if (! $this->disk()->directoryExists($source)) {
                continue;
            }
            if ($this->disk()->directoryExists($target)) {
                throw new ApiHttpException(400, 'Destination notebook already exists.', 'bad_request');
            }
            $this->disk()->makeDirectory(dirname($target));
            if (! $this->disk()->move($source, $target)) {
                throw new ApiHttpException(500, 'Could not rename notebook.', 'server_error');
            }
        }

        return ['ok' => true, 'from' => $from, 'to' => $to];
    }

    /**
     * @param  array<string, mixed>  $body
     * @return array<string, mixed>
     */
    public function deleteNotebook(string $username, string $name, array $body): array
    {
        $notebook = $this->sanitizeNotebook($name);
        $mode = isset($body['mode']) && is_string($body['mode']) ? strtolower(trim($body['mode'])) : 'archive';
        if (! in_array($mode, ['archive', 'move', 'purge'], true)) {
            throw new ApiHttpException(400, 'Invalid notebook delete mode.', 'bad_request');
        }
        if ($mode === 'move') {
            $target = $this->sanitizeNotebook((string) ($body['target'] ?? ''));
            if ($target === $notebook) {
                throw new ApiHttpException(400, 'Target notebook must be different.', 'bad_request');
            }
            foreach ([false, true] as $archived) {
                $sourceDir = $this->notePaths->notebookKey($username, $notebook, $archived);
                if (! $this->disk()->directoryExists($sourceDir)) {
                    continue;
                }
                $targetDir = $this->notePaths->notebookKey($username, $target, $archived);
                $this->disk()->makeDirectory($targetDir);
                $this->moveMarkdownFiles($sourceDir, $targetDir);
                $this->removeDirIfEmpty($sourceDir);
            }

            return ['ok' => true, 'mode' => 'move', 'target' => $target];
        }
        if ($mode === 'archive') {
            $sourceDir = $this->notePaths->notebookKey($username, $notebook, false);
            if ($this->disk()->directoryExists($sourceDir)) {
                $archiveDir = $this->notePaths->notebookKey($username, $notebook, true);
                $this->disk()->makeDirectory($archiveDir);
                $this->moveMarkdownFiles($sourceDir, $archiveDir);
                $this->removeDirIfEmpty($sourceDir);
            }

            return ['ok' => true, 'mode' => 'archive'];
        }

        foreach ([false, true] as $archived) {
            $this->removeNotebookCompletely($this->notePaths->notebookKey($username, $notebook, $archived));
        }

        return ['ok' => true, 'mode' => 'purge'];
    }

    /**
     * @return list<array<string, mixed>>
     */
    private function readAll(string $username): array
    {
        $out = [];
        foreach ([false, true] as $archived) {
            $base = $this->notePaths->baseKey($username, $archived);
            if (! $this->disk()->directoryExists($base)) {
                continue;
            }
            foreach ($this->disk()->directories($base) as $notebookDir) {
                $notebook = basename($notebookDir);
                if (! $archived && $notebook === '.archive') {
                    continue;
                }
                foreach ($this->disk()->files($notebookDir) as $fileKey) {
                    $filename = basename($fileKey);
                    if (! $this->codec->isNoteFilename($filename)) {
                        continue;
                    }
                    $id = substr($filename, 0, -3);
                    if ($id === '') {
                        continue;
                    }
                    $out[] = $this->readAt($fileKey, $username, $notebook, $id, $archived);
                }
            }
        }

        return $out;
    }

    /**
     * @return array{key: string, notebook: string, archived: bool}|null
     */
    private function findNoteKey(string $username, string $id, ?string $notebook, ?bool $archived): ?array
    {
        $candidates = [];
        $archivedOptions = $archived === null ? [false, true] : [$archived];
        foreach ($archivedOptions as $isArchived) {
            if ($notebook !== null) {
                $candidates[] = [
                    'key' => $this->notePaths->noteKey($username, $notebook, $id, $isArchived),
                    'notebook' => $notebook,
                    'archived' => $isArchived,
                ];

                continue;
            }
            $base = $this->notePaths->baseKey($username, $isArchived);
            if (! $this->disk()->directoryExists($base)) {
                continue;
            }
            foreach ($this->disk()->directories($base) as $notebookDir) {
                $entry = basename($notebookDir);
                if (! $isArchived && $entry === '.archive') {
                    continue;
                }
                $candidates[] = [
                    'key' => $this->notePaths->noteKey($username, $entry, $id, $isArchived),
                    'notebook' => $entry,
                    'archived' => $isArchived,
                ];
            }
        }
        foreach ($candidates as $candidate) {
            if ($this->disk()->exists($candidate['key'])) {
                return $candidate;
            }
        }

        return null;
    }

    /**
     * @return array<string, mixed>
     */
    private function readAt(string $key, string $username, string $notebook, string $id, bool $archived): array
    {
        $raw = $this->disk()->exists($key) ? (string) $this->disk()->get($key) : '';
        [$title, $tags, $starred, $body] = $this->codec->parse($raw, $id);
        $mtime = $this->disk()->exists($key) ? $this->disk()->lastModified($key) : time();

        return [
            'id' => $id,
            'username' => $username,
            'notebook' => $notebook,
            'title' => $title,
            'body' => $body,
            'tags' => $tags,
            'starred' => $starred,
            'archived' => $archived,
            'updatedAt' => date('c', $mtime),
        ];
    }

    private function disk(): Filesystem
    {
        return $this->storage->notes();
    }

    private function sanitizeNoteId(string $id): string
    {
        $trimmed = trim($id);
        if ($trimmed === '' || preg_match('/^[A-Za-z0-9._-]{1,120}$/', $trimmed) !== 1) {
            throw new ApiHttpException(400, 'Invalid note id.', 'bad_request');
        }

        return $trimmed;
    }

    private function sanitizeNotebook(string $notebook): string
    {
        $trimmed = trim($notebook);
        if (
            $trimmed === ''
            || str_contains($trimmed, '/')
            || str_contains($trimmed, '\\')
            || str_contains($trimmed, "\0")
            || str_contains($trimmed, '..')
        ) {
            throw new ApiHttpException(400, 'Invalid notebook name.', 'bad_request');
        }

        return $trimmed;
    }

    private function moveMarkdownFiles(string $sourceDir, string $targetDir): void
    {
        foreach ($this->disk()->files($sourceDir) as $from) {
            $entry = basename($from);
            if (! $this->codec->isNoteFilename($entry)) {
                continue;
            }
            $to = $targetDir.'/'.$entry;
            if ($this->disk()->exists($to)) {
                throw new ApiHttpException(400, 'Target notebook already contains note '.$entry.'.', 'bad_request');
            }
            if (! $this->disk()->move($from, $to)) {
                throw new ApiHttpException(500, 'Could not move notebook notes.', 'server_error');
            }
            $this->syncSearchIndex(fn () => $this->searchIndexer->deleteDavPath('files/'.$from));
            $this->syncSearchIndex(fn () => $this->searchIndexer->indexFileStorageKey($to));
        }
    }

    private function removeDirIfEmpty(string $dir): void
    {
        if (! $this->disk()->directoryExists($dir)) {
            return;
        }
        if ($this->disk()->files($dir) !== [] || $this->disk()->directories($dir) !== []) {
            return;
        }
        $this->disk()->deleteDirectory($dir);
    }

    private function removeNotebookCompletely(string $dir): void
    {
        if (! $this->disk()->directoryExists($dir)) {
            return;
        }
        foreach ($this->disk()->files($dir) as $path) {
            if ($this->codec->isNoteFilename(basename($path))) {
                $this->disk()->delete($path);
                $this->syncSearchIndex(fn () => $this->searchIndexer->deleteDavPath('files/'.$path));
            }
        }
        $this->removeDirIfEmpty($dir);
    }

    /**
     * Keep notes APIs resilient when search index tables are unavailable.
     *
     * @param  callable(): void  $callback
     */
    private function syncSearchIndex(callable $callback): void
    {
        try {
            $callback();
        } catch (QueryException) {
            // Search index is optional in some test and bootstrap contexts.
        } catch (\Throwable) {
            // Search sync should never block note writes.
        }
    }
}
