<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Admin;

use App\Services\Plugins\PluginInstallerService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

final class PluginInstallController
{
    public function __construct(private PluginInstallerService $installer) {}

    public function __invoke(Request $request): JsonResponse
    {
        $file = $request->file('plugin');
        if (! $file) {
            return response()->json([
                'error' => 'bad_request',
                'message' => 'Missing plugin file upload in field "plugin".',
            ], 400);
        }

        try {
            return response()->json($this->installer->installFromZip($file));
        } catch (\InvalidArgumentException $e) {
            return response()->json([
                'error' => 'bad_request',
                'message' => $e->getMessage(),
            ], 400);
        } catch (\RuntimeException $e) {
            return response()->json([
                'error' => 'install_failed',
                'message' => $e->getMessage(),
            ], 500);
        }
    }
}
