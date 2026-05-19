<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Admin;

use App\Exceptions\ApiHttpException;
use App\Services\Update\UpdateStateService;
use Illuminate\Http\JsonResponse;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

final class UpdateBackupController
{
    public function __construct(private UpdateStateService $updates)
    {
    }

    public function show(string $name): BinaryFileResponse
    {
        try {
            $path = $this->updates->backupAbsolutePath($name);

            return response()->download($path, basename($path), [
                'Content-Type' => 'application/zip',
            ]);
        } catch (\InvalidArgumentException $e) {
            throw new ApiHttpException(400, $e->getMessage(), 'bad_request');
        } catch (\RuntimeException $e) {
            throw new ApiHttpException(404, $e->getMessage(), 'not_found');
        }
    }

    public function destroy(string $name): JsonResponse
    {
        try {
            return response()->json($this->updates->deleteBackup($name));
        } catch (\InvalidArgumentException $e) {
            throw new ApiHttpException(400, $e->getMessage(), 'bad_request');
        }
    }
}
