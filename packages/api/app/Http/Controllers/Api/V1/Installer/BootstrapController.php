<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Installer;

use App\Services\Installer\InstallerWebBase;
use App\Services\Installer\InstallerWizardService;
use Illuminate\Http\JsonResponse;

final class BootstrapController
{
    public function __construct(private InstallerWizardService $wizard)
    {
    }

    public function __invoke(): JsonResponse
    {
        return response()->json($this->wizard->bootstrap(InstallerWebBase::detect()));
    }
}
