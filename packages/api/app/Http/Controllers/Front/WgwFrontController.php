<?php

declare(strict_types=1);

namespace App\Http\Controllers\Front;

use App\Dav\SabreKernel;
use App\Services\Ui\UiFrontKernel;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

final class WgwFrontController
{
    public function __construct(
        private UiFrontKernel $ui,
        private SabreKernel $sabre,
    ) {}

    public function __invoke(Request $request): Response
    {
        $uiResponse = $this->ui->handle($request);
        if ($uiResponse !== null) {
            return $uiResponse;
        }

        return $this->sabre->serve($request);
    }
}
