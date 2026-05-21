<?php

declare(strict_types=1);

namespace App\Services\Notes;

use App\Models\Principal;
use App\Support\ApiUrlBuilder;
use App\Support\AppPaths;
use App\Support\WgwSettings;

final class NotesStateService
{
    public function __construct(
        private ApiUrlBuilder $urls,
        private AppPaths $paths,
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
            'distReady' => $this->paths->appDistIndex('notes') !== null,
        ];
    }
}
