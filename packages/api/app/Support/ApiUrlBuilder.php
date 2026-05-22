<?php

declare(strict_types=1);

namespace App\Support;

use Illuminate\Http\Request;

final class ApiUrlBuilder
{
    public function __construct(private Request $request) {}

    public function v1(string $path): string
    {
        $root = rtrim($this->request->getSchemeAndHttpHost().$this->request->getBaseUrl(), '/');

        return $root.'/api/v1/'.ltrim($path, '/');
    }

    public function logout(): string
    {
        return $this->appPath('logout');
    }

    public function appPath(string $path): string
    {
        $root = rtrim($this->request->getSchemeAndHttpHost().dirname($this->request->getBaseUrl()), '/');

        return $root.'/'.ltrim($path, '/');
    }
}
