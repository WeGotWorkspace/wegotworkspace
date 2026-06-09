<?php

declare(strict_types=1);

namespace App\Services\Drive;

use App\Models\Principal;
use App\Storage\WgwStorage;

final class DriveGitVersioningService
{
    public function __construct(
        private WgwStorage $storage,
        private DriveVersioningPolicy $policy,
        private DriveGitRepository $repository,
    ) {}

    public function recordUpsert(string $storageKey, string $username): void
    {
        if (! $this->isEnabled()) {
            return;
        }

        $this->commitUpsert($storageKey, $username);
    }

    public function recordDelete(string $storageKey, string $username): void
    {
        if (! $this->isEnabled()) {
            return;
        }

        $this->commitDelete($storageKey, $username);
    }

    public function recordMove(string $fromKey, string $toKey, string $username): void
    {
        if (! $this->isEnabled()) {
            return;
        }

        $fromScope = $this->policy->resolveFromStorageKey($fromKey);
        $toScope = $this->policy->resolveFromStorageKey($toKey);
        if ($fromScope === null || $toScope === null) {
            return;
        }

        if ($fromScope->repoStorageKey !== $toScope->repoStorageKey) {
            $this->commitDelete($fromKey, $username);
            $this->commitUpsert($toKey, $username);

            return;
        }

        $repoRoot = $this->repoRootForScope($fromScope);
        if ($repoRoot === null) {
            return;
        }

        $author = $this->authorIdentity($username);
        $message = 'Auto: '.$username.' moved '.$fromScope->relativePath.' to '.$toScope->relativePath;
        $this->repository->commitMove(
            $repoRoot,
            $fromScope->relativePath,
            $toScope->relativePath,
            $author,
            $message,
        );
    }

    public function recordDavUpsert(string $davPath, ?string $principalUri): void
    {
        if (! $this->isEnabled()) {
            return;
        }

        $username = $this->usernameFromPrincipal($principalUri);
        if ($username === null) {
            return;
        }

        $storageKey = $this->storageKeyFromDavPath($davPath);
        if ($storageKey === null) {
            return;
        }

        $this->commitUpsert($storageKey, $username);
    }

    public function recordDavDelete(string $davPath, ?string $principalUri): void
    {
        if (! $this->isEnabled()) {
            return;
        }

        $username = $this->usernameFromPrincipal($principalUri);
        if ($username === null) {
            return;
        }

        $storageKey = $this->storageKeyFromDavPath($davPath);
        if ($storageKey === null) {
            return;
        }

        $this->recordDelete($storageKey, $username);
    }

    public function recordDavMove(string $fromDav, string $toDav, ?string $principalUri): void
    {
        if (! $this->isEnabled()) {
            return;
        }

        $username = $this->usernameFromPrincipal($principalUri);
        if ($username === null) {
            return;
        }

        $fromKey = $this->storageKeyFromDavPath($fromDav);
        $toKey = $this->storageKeyFromDavPath($toDav);
        if ($fromKey === null || $toKey === null) {
            return;
        }

        $this->recordMove($fromKey, $toKey, $username);
    }

    private function commitUpsert(string $storageKey, string $username): void
    {
        $scope = $this->policy->resolveFromStorageKey($storageKey);
        if ($scope === null) {
            return;
        }

        $repoRoot = $this->repoRootForScope($scope);
        if ($repoRoot === null) {
            return;
        }

        $absolutePath = $repoRoot.'/'.$scope->relativePath;
        if (! $this->policy->shouldVersion($absolutePath, $storageKey)) {
            return;
        }

        $author = $this->authorIdentity($username);
        $message = 'Auto: '.$username.' updated '.$scope->relativePath;
        $this->repository->commitUpsert($repoRoot, $scope->relativePath, $author, $message);
    }

    private function commitDelete(string $storageKey, string $username): void
    {
        $scope = $this->policy->resolveFromStorageKey($storageKey);
        if ($scope === null) {
            return;
        }

        $repoRoot = $this->repoRootForScope($scope);
        if ($repoRoot === null) {
            return;
        }

        $author = $this->authorIdentity($username);
        $message = 'Auto: '.$username.' deleted '.$scope->relativePath;
        $this->repository->commitDelete($repoRoot, $scope->relativePath, $author, $message);
    }

    private function repoRootForScope(DriveGitScope $scope): ?string
    {
        $disk = $this->storage->files();
        if (! $disk->directoryExists($scope->repoStorageKey) && ! $disk->exists($scope->repoStorageKey)) {
            return null;
        }

        return $disk->path($scope->repoStorageKey);
    }

    private function storageKeyFromDavPath(string $davPath): ?string
    {
        $normalized = trim(str_replace('\\', '/', $davPath), '/');
        if ($normalized === '' || ! str_starts_with($normalized, 'files/')) {
            return null;
        }

        $storageKey = substr($normalized, strlen('files/'));
        if ($storageKey === '') {
            return null;
        }

        return $storageKey;
    }

    private function usernameFromPrincipal(?string $principalUri): ?string
    {
        if ($principalUri === null || $principalUri === '') {
            return null;
        }

        $prefix = 'principals/';
        if (! str_starts_with($principalUri, $prefix)) {
            return null;
        }

        $username = substr($principalUri, strlen($prefix));
        if ($username === '') {
            return null;
        }

        return $username;
    }

    private function authorIdentity(string $username): string
    {
        $principal = Principal::query()->where('uri', 'principals/'.$username)->first();
        $name = (string) ($principal?->displayname ?: $username);

        return $name.' <'.$username.'@wgw.local>';
    }

    private function isEnabled(): bool
    {
        return (bool) config('wgw.git_versioning.enabled', true);
    }
}
