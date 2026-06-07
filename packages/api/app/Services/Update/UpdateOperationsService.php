<?php

declare(strict_types=1);

namespace App\Services\Update;

use App\Support\UpdateFeedDefaults;
use App\Support\WgwInstallConfig;

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
        return $this->runner->check($this->updateFeedUrl());
    }

    /**
     * @param  array<string, mixed>  $input
     * @return array<string, mixed>
     */
    public function apply(array $input): array
    {
        return $this->runner->apply($input);
    }

    /**
     * @return array<string, mixed>
     */
    public function cancel(): array
    {
        return $this->runner->cancel();
    }

    private function updateFeedUrl(): string
    {
        $file = $this->install->readInstallFileConfig();
        $fromFile = isset($file['update_feed_url']) && is_string($file['update_feed_url'])
            ? trim($file['update_feed_url'])
            : '';

        return $fromFile !== '' ? $fromFile : UpdateFeedDefaults::MANIFEST_URL;
    }
}
