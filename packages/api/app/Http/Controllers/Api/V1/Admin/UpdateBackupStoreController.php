<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Admin;

use Illuminate\Http\JsonResponse;

final class UpdateBackupStoreController
{
    public function __invoke(): JsonResponse
    {
        return response()->json(['error' => 'Manual database backup creation is not available on this server yet.'], 404);
    }
}
