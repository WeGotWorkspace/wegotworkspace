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
        $maskAsGeneric = $status >= 500 && $code !== 'config_error';
        if ($maskAsGeneric) {
            $debug = trim((string) getenv('WGW_API_DEBUG_ERRORS'));
            if ($debug !== '1') {
                $payload['error'] = 'Internal server error.';
            }
        }
        if ($status >= 500) {
            $payload['request_id'] = self::requestId();
            header('X-Request-Id: '.$payload['request_id']);
        }
        if ($code !== null && $code !== '') {
            $payload['code'] = $code;
        }
        self::json($status, $payload);
    }

    private static function requestId(): string
    {
        return bin2hex(random_bytes(8));
    }
}
