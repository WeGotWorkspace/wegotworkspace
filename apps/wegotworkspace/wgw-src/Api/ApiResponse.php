<?php

declare(strict_types=1);

namespace App\Api;

final class ApiResponse
{
    /**
     * @param array<string, mixed> $payload
     */
    public static function json(int $status, array $payload): void
    {
        http_response_code($status);
        header('Content-Type: application/json; charset=utf-8');
        header('Cache-Control: no-store');
        echo (string) json_encode($payload, JSON_UNESCAPED_SLASHES);
    }

    public static function error(int $status, string $message, ?string $code = null): void
    {
        $payload = ['error' => $message];
        if ($code !== null && $code !== '') {
            $payload['code'] = $code;
        }
        self::json($status, $payload);
    }
}
