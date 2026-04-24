<?php

declare(strict_types=1);

/**
 * FastRoute table for the Sabre Drive SPA (see {@code packages/drive-ui/}).
 * Full FileGator upstream routes live in vendor; we only register what the custom UI calls.
 */
return [
    [
        'route' => [
            'GET', '/getuser', '\Filegator\Controllers\AuthController@getUser',
        ],
        'roles' => [
            'guest', 'user', 'admin',
        ],
        'permissions' => [
        ],
    ],
    [
        'route' => [
            'POST', '/getdir', '\Filegator\Controllers\FileController@getDirectory',
        ],
        'roles' => [
            'guest', 'user', 'admin',
        ],
        'permissions' => [
            'read',
        ],
    ],
    [
        'route' => [
            'POST', '/searchfiles', '\App\Filegator\DriveSearchController@searchFiles',
        ],
        'roles' => [
            'guest', 'user', 'admin',
        ],
        'permissions' => [
            'read',
        ],
    ],
    [
        'route' => [
            'GET', '/download', '\Filegator\Controllers\DownloadController@download',
        ],
        'roles' => [
            'guest', 'user', 'admin',
        ],
        'permissions' => [
            'download',
        ],
    ],
    [
        'route' => [
            'POST', '/renameitem', '\Filegator\Controllers\FileController@renameItem',
        ],
        'roles' => [
            'guest', 'user', 'admin',
        ],
        'permissions' => [
            'read', 'write',
        ],
    ],
    [
        'route' => [
            'POST', '/deleteitems', '\Filegator\Controllers\FileController@deleteItems',
        ],
        'roles' => [
            'guest', 'user', 'admin',
        ],
        'permissions' => [
            'read', 'write',
        ],
    ],
    [
        'route' => [
            'POST', '/changedir', '\Filegator\Controllers\FileController@changeDirectory',
        ],
        'roles' => [
            'guest', 'user', 'admin',
        ],
        'permissions' => [
            'read',
        ],
    ],
    [
        'route' => [
            'POST', '/createnew', '\Filegator\Controllers\FileController@createNew',
        ],
        'roles' => [
            'guest', 'user', 'admin',
        ],
        'permissions' => [
            'read', 'write',
        ],
    ],
    [
        'route' => [
            'GET', '/upload', '\Filegator\Controllers\UploadController@chunkCheck',
        ],
        'roles' => [
            'guest', 'user', 'admin',
        ],
        'permissions' => [
            'upload',
        ],
    ],
    [
        'route' => [
            'POST', '/upload', '\Filegator\Controllers\UploadController@upload',
        ],
        'roles' => [
            'guest', 'user', 'admin',
        ],
        'permissions' => [
            'upload',
        ],
    ],
];
