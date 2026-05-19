<?php

declare(strict_types=1);

namespace App\Dav;

use App\Support\AppPaths;

final class SabreKernel
{
    public function __construct(
        private SabreServerFactory $factory,
        private AppPaths $paths,
    ) {
    }

    public function handle(): void
    {
        if (! $this->paths->isInstalled()) {
            http_response_code(503);
            header('Content-Type: text/plain; charset=utf-8');
            echo "WeGotWorkspace is not installed. Open /install/ to finish setup.\n";
            exit;
        }

        if (empty($_SERVER['HTTP_AUTHORIZATION']) && ! empty($_SERVER['REDIRECT_HTTP_AUTHORIZATION'])) {
            $_SERVER['HTTP_AUTHORIZATION'] = $_SERVER['REDIRECT_HTTP_AUTHORIZATION'];
        }

        $this->factory->create()->start();
    }
}
