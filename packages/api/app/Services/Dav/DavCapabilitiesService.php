<?php

declare(strict_types=1);

namespace App\Services\Dav;

use App\Support\WgwSettings;

final class DavCapabilitiesService
{
    /**
     * @return array{
     *   baseUri: string,
     *   filesEnabled: bool,
     *   calendarEnabled: bool,
     *   contactsEnabled: bool
     * }
     */
    public function snapshot(): array
    {
        $cfg = WgwSettings::normalized();

        return [
            'baseUri' => (string) ($cfg[WgwSettings::BASE_URI] ?? '/'),
            'filesEnabled' => (bool) ($cfg[WgwSettings::FILES_ENABLED] ?? true),
            'calendarEnabled' => (bool) ($cfg[WgwSettings::CALENDAR_ENABLED] ?? true),
            'contactsEnabled' => (bool) ($cfg[WgwSettings::CONTACTS_ENABLED] ?? true),
        ];
    }
}
