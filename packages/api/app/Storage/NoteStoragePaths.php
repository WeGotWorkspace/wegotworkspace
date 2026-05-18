<?php

declare(strict_types=1);

namespace App\Storage;

final class NoteStoragePaths
{
    public function __construct(private StoragePaths $paths)
    {
    }

    public function baseKey(string $username, bool $archived): string
    {
        return $archived
            ? $this->paths->noteStorageKey($username, '.archive')
            : rtrim($this->paths->noteStorageKey($username, ''), '/');
    }

    public function notebookKey(string $username, string $notebook, bool $archived): string
    {
        return $this->baseKey($username, $archived).'/'.$notebook;
    }

    public function noteKey(string $username, string $notebook, string $id, bool $archived): string
    {
        return $this->notebookKey($username, $notebook, $archived).'/'.$id.'.md';
    }
}
