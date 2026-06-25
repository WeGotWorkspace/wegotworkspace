<?php

declare(strict_types=1);

namespace App\Storage;

final class NoteStoragePaths
{
    public function __construct(private StoragePaths $paths) {}

    public function baseKey(NoteScope $scope, bool $archived): string
    {
        $root = $this->scopeRoot($scope);

        return $archived ? $root.'/.archive' : $root;
    }

    public function notebookKey(NoteScope $scope, string $notebook, bool $archived): string
    {
        return $this->baseKey($scope, $archived).'/'.$notebook;
    }

    public function noteKey(NoteScope $scope, string $notebook, string $id, bool $archived): string
    {
        return $this->notebookKey($scope, $notebook, $archived).'/'.$id.'.md';
    }

    private function scopeRoot(NoteScope $scope): string
    {
        $key = $scope->isGroup()
            ? $this->paths->groupNoteStorageKey($scope->owner(), '')
            : $this->paths->noteStorageKey($scope->owner(), '');

        return rtrim($key, '/');
    }
}
