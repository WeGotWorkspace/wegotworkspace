<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Admin;

use App\Services\Update\UpdateStateStore;
use Illuminate\Http\JsonResponse;

final class UpdateLogController
{
    public function __construct(private UpdateStateStore $store)
    {
    }

    public function show(): JsonResponse
    {
        return response()->json(['lines' => $this->store->readLog()]);
    }

    public function destroy(): JsonResponse
    {
        $this->store->clearLog();

        return response()->json(['ok' => true, 'lines' => []]);
    }
}
