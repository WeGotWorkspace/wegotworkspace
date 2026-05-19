<?php

declare(strict_types=1);

namespace App\Services\Update;

use App\Storage\WgwStorage;
use Illuminate\Contracts\Filesystem\Filesystem;

final class UpdateStateStore
{
    private const BASE = 'updates';

    public function __construct(private WgwStorage $storage)
    {
    }

    /**
     * @return array<string, mixed>
     */
    public function read(): array
    {
        $disk = $this->disk();
        if (! $disk->exists(self::BASE.'/state.json')) {
            return [];
        }
        $raw = $disk->get(self::BASE.'/state.json');
        $decoded = json_decode($raw, true);

        return is_array($decoded) ? $decoded : [];
    }

    /**
     * @param array<string, mixed> $state
     */
    public function write(array $state): void
    {
        $this->disk()->put(
            self::BASE.'/state.json',
            json_encode($state, JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT)."\n"
        );
    }

    /**
     * @return list<string>
     */
    public function readLog(): array
    {
        $path = self::BASE.'/process.log';
        $disk = $this->disk();
        if (! $disk->exists($path)) {
            return [];
        }

        $lines = preg_split("/\r\n|\n|\r/", $disk->get($path)) ?: [];

        return array_values(array_slice(array_filter($lines, static fn (string $line): bool => trim($line) !== ''), -300));
    }

    public function clearLog(): void
    {
        $this->disk()->put(self::BASE.'/process.log', '');
    }

    public function lockPath(): string
    {
        return self::BASE.'/update.lock';
    }

    public function maintenancePath(): string
    {
        return self::BASE.'/.maintenance';
    }

    public function backupDir(): string
    {
        return self::BASE.'/backup';
    }

    public function isLocked(): bool
    {
        return $this->disk()->exists($this->lockPath());
    }

    public function isMaintenance(): bool
    {
        return $this->disk()->exists($this->maintenancePath());
    }

    private function disk(): Filesystem
    {
        return $this->storage->data();
    }
}
