<?php

declare(strict_types=1);

namespace App\Services\Notes;

use App\Support\WgwInstallConfig;
use App\Support\WgwSettings;
use Illuminate\Support\Facades\File;

final class NotesCapabilitiesService
{
    public function __construct(private WgwInstallConfig $install)
    {
    }

    /**
     * @return array{enabled: bool, distReady: bool, baseUri: string}
     */
    public function snapshot(): array
    {
        $cfg = WgwSettings::normalized();

        return [
            'enabled' => (bool) ($cfg[WgwSettings::FILES_ENABLED] ?? true),
            'distReady' => File::isFile($this->notesDistIndex()),
            'baseUri' => (string) ($cfg[WgwSettings::BASE_URI] ?? '/'),
        ];
    }

    private function notesDistIndex(): string
    {
        return $this->install->installRoot().'/packages/apps/notes/dist/index.html';
    }
}
