<?php

declare(strict_types=1);

namespace App\Services\Update;

use App\Support\WgwInstallConfig;
use Illuminate\Support\Facades\DB;

final class UpdateOperationsService
{
    public function __construct(
        private UpdateRunner $runner,
        private WgwInstallConfig $install,
    ) {}

    /**
     * @return array<string, mixed>
     */
    public function check(): array
    {
        return $this->runner->check(DB::connection('wgw')->getPdo(), $this->updateFeedUrl());
    }

    /**
     * @param  array<string, mixed>  $input
     * @return array<string, mixed>
     */
    public function apply(array $input): array
    {
        return $this->runner->apply(DB::connection('wgw')->getPdo(), $input);
    }

    /**
     * @return array<string, mixed>
     */
    public function cancel(): array
    {
        return $this->runner->cancel(DB::connection('wgw')->getPdo());
    }

    private function updateFeedUrl(): string
    {
        $file = $this->install->readInstallFileConfig();
        $fromFile = isset($file['update_feed_url']) && is_string($file['update_feed_url'])
            ? trim($file['update_feed_url'])
            : '';

        return $fromFile !== '' ? $fromFile : 'https://github.com/woutervroege/wegotworkspace/releases/latest/download/manifest.json';
    }
}
