<?php

declare(strict_types=1);

return [
    'default' => env('FILESYSTEM_DISK', 'local'),

    'disks' => [
        'local' => [
            'driver' => 'local',
            'root' => storage_path('app/private'),
            'serve' => true,
            'throw' => false,
            'report' => false,
        ],

        'wgw_data' => [
            'driver' => 'local',
            'root' => storage_path('app/wgw-data'),
            'throw' => true,
        ],

        'wgw_files' => [
            'driver' => 'local',
            'root' => storage_path('app/wgw-files'),
            'throw' => true,
        ],

        'wgw_notes' => [
            'driver' => 'local',
            'root' => storage_path('app/wgw-files'),
            'throw' => true,
        ],
    ],

    'links' => [],
];
