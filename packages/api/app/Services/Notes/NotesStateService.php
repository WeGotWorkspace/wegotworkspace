<?php

declare(strict_types=1);

namespace App\Services\Notes;

use App\Models\Principal;
use App\Support\ApiUrlBuilder;
use App\Support\WgwInstallConfig;
use App\Support\WgwSettings;
use Illuminate\Support\Facades\File;

final class NotesStateService
{
    public function __construct(
        private ApiUrlBuilder $urls,
        private WgwInstallConfig $install,
    ) {
    }

    /**
     * @return array<string, mixed>
     */
    public function forUser(string $username): array
    {
        $cfg = WgwSettings::normalized();
        $principal = Principal::forUsername($username);
        $display = trim((string) ($principal?->displayname ?? ''));

        return [
            'baseUri' => (string) ($cfg[WgwSettings::BASE_URI] ?? '/'),
            'username' => $username,
            'displayName' => $display !== '' ? $display : $username,
            'logoutUrl' => $this->urls->logout(),
            'notesPath' => $this->urls->appPath('notes/'),
            'filesEnabled' => (bool) ($cfg[WgwSettings::FILES_ENABLED] ?? true),
            'distReady' => File::isFile($this->install->installRoot().'/packages/apps/notes/dist/index.html'),
        ];
    }
}
