<?php

declare(strict_types=1);

namespace App\Services\Tasks;

use App\Support\WgwSettings;

final class TasksCapabilitiesService
{
    /**
     * @return array{
     *     enabled: bool,
     *     jmapCapability: string,
     *     supportedTaskProperties: list<string>
     * }
     */
    public function snapshot(): array
    {
        $cfg = WgwSettings::normalized();

        return [
            'enabled' => (bool) ($cfg[WgwSettings::CALENDAR_ENABLED] ?? true),
            'jmapCapability' => 'urn:ietf:params:jmap:tasks',
            'supportedTaskProperties' => [
                'title',
                'description',
                'start',
                'due',
                'completed',
                'workflowStatus',
                'progress',
                'priority',
                'categories',
                'privacy',
            ],
        ];
    }
}
