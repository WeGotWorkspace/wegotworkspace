<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Plugins;

use App\Services\Plugins\PluginRegistryService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

final class ActivationController
{
    public function __construct(private PluginRegistryService $plugins) {}

    public function __invoke(Request $request, string $id): JsonResponse
    {
        $active = $request->boolean('active', true);
        if ($request->json()->has('active')) {
            $active = (bool) $request->json('active');
        }

        $result = $this->plugins->setActive($id, $active);
        if ($result === null) {
            return response()->json([
                'error' => 'plugin_not_found',
                'message' => 'Plugin not found.',
            ], 404);
        }

        return response()->json($result);
    }
}
