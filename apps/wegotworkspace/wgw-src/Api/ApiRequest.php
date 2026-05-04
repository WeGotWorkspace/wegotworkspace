<?php

declare(strict_types=1);

namespace App\Api;

final class ApiRequest
{
    public static function method(): string
    {
        return strtoupper((string) ($_SERVER['REQUEST_METHOD'] ?? 'GET'));
    }

    /**
     * @return array<string, mixed>
     */
    public static function jsonBody(): array
    {
        $raw = '';
        if (isset($GLOBALS['__WGW_TEST_JSON_BODY']) && is_string($GLOBALS['__WGW_TEST_JSON_BODY'])) {
            $raw = $GLOBALS['__WGW_TEST_JSON_BODY'];
        } else {
            $raw = (string) file_get_contents('php://input');
        }
        if ($raw === '') {
            return [];
        }
        $data = json_decode($raw, true);
        if (!is_array($data)) {
            throw new \InvalidArgumentException('Invalid JSON body.');
        }

        return $data;
    }
}
