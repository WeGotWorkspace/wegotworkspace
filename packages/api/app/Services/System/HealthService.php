<?php

declare(strict_types=1);

namespace App\Services\System;

final class HealthService
{
    /**
     * @return array{status: string, apiVersion: string, timestamp: string}
     */
    public function snapshot(): array
    {
        return [
            'status' => 'ok',
            'apiVersion' => 'v1',
            'timestamp' => gmdate(DATE_ATOM),
        ];
    }
}
