<?php

use App\Providers\AppServiceProvider;
use App\Providers\WgwServiceProvider;
use Illuminate\Database\MigrationServiceProvider;

return [
    AppServiceProvider::class,
    WgwServiceProvider::class,
    MigrationServiceProvider::class,
];
