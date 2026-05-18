<?php

declare(strict_types=1);

return [
    'auth_realm' => env('WGW_AUTH_REALM', 'SabreDAV'),

    'jwt' => [
        'issuer' => env('WGW_API_JWT_ISSUER', 'wegotworkspace-api'),
        'audience' => env('WGW_API_JWT_AUDIENCE', 'wegotworkspace-clients'),
        'kid' => env('WGW_API_JWT_KID', 'wgw-rs256-v1'),
        'private_key' => env('WGW_API_JWT_PRIVATE_KEY'),
        'public_key' => env('WGW_API_JWT_PUBLIC_KEY'),
        'private_key_path' => env('WGW_API_JWT_PRIVATE_KEY_PATH'),
        'public_key_path' => env('WGW_API_JWT_PUBLIC_KEY_PATH'),
        'previous_kid' => env('WGW_API_JWT_PREVIOUS_KID'),
        'previous_public_key' => env('WGW_API_JWT_PREVIOUS_PUBLIC_KEY'),
        'previous_public_key_path' => env('WGW_API_JWT_PREVIOUS_PUBLIC_KEY_PATH'),
        'access_ttl' => (int) env('WGW_API_JWT_ACCESS_TTL', 3600),
        'refresh_ttl' => (int) env('WGW_API_JWT_REFRESH_TTL', 1209600),
    ],
];
