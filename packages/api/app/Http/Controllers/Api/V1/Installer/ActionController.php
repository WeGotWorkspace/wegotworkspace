<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Installer;

use App\Http\Requests\Api\V1\InstallerActionRequest;
use App\Services\Installer\InstallerWebBase;
use App\Services\Installer\InstallerWizardService;
use Illuminate\Http\JsonResponse;

final class ActionController
{
    public function __construct(private InstallerWizardService $wizard)
    {
    }

    public function __invoke(InstallerActionRequest $request): JsonResponse
    {
        $validated = $request->validated();

        return response()->json($this->wizard->applyAction(
            InstallerWebBase::detect(),
            (string) $validated['action'],
            is_array($validated['payload'] ?? null) ? $validated['payload'] : [],
        ));
    }
}
