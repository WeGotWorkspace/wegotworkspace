<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Plugins;

use App\Services\Plugins\PluginRegistryService;
use Illuminate\Http\JsonResponse;

final class DeactivateController
{
    public function __construct(private PluginRegistryService $plugins) {}

    public function __invoke(string $id): JsonResponse
    {
        $result = $this->plugins->setActive($id, false);
        if ($result === null) {
            return response()->json([
                'error' => 'plugin_not_found',
                'message' => 'Plugin not found.',
            ], 404);
        }

        return response()->json($result);
    }
}
