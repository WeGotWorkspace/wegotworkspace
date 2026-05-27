<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Plugins;

use App\Services\Plugins\PluginRegistryService;
use Illuminate\Http\JsonResponse;

final class IndexController
{
    public function __construct(private PluginRegistryService $plugins) {}

    public function __invoke(): JsonResponse
    {
        return response()->json([
            'plugins' => $this->plugins->list(),
        ]);
    }
}
