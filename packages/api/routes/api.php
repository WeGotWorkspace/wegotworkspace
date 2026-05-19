<?php

declare(strict_types=1);

use App\Http\Controllers\Api\V1\System\HealthController;
use Illuminate\Support\Facades\Route;

/*
| Greenfield REST API — contract: packages/api/openapi/openapi.json
| Prefix: /api/v1 (see bootstrap/app.php apiPrefix)
*/

Route::get('/health', HealthController::class);
