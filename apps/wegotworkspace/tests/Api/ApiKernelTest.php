<?php

declare(strict_types=1);

namespace Tests\Api;

use App\Api\ApiKernel;
use PHPUnit\Framework\TestCase;

final class ApiKernelTest extends TestCase
{
    public function testRoleHierarchy(): void
    {
        self::assertTrue(ApiKernel::roleAllows('admin', 'user'));
        self::assertTrue(ApiKernel::roleAllows('user', 'guest'));
        self::assertFalse(ApiKernel::roleAllows('guest', 'user'));
        self::assertFalse(ApiKernel::roleAllows('user', 'admin'));
    }

    public function testHealthEndpointResponds(): void
    {
        $_SERVER['REQUEST_METHOD'] = 'GET';
        ob_start();
        $handled = ApiKernel::tryRespond('', '/api/v1/health');
        $raw = (string) ob_get_clean();
        $json = json_decode($raw, true);

        self::assertTrue($handled);
        self::assertIsArray($json);
        self::assertSame('ok', $json['status'] ?? null);
        self::assertSame('v1', $json['apiVersion'] ?? null);
    }

    public function testAuthTokenReturnsUnauthorizedForBadCredentials(): void
    {
        putenv('WGW_API_JWT_PRIVATE_KEY=');
        putenv('WGW_API_JWT_PUBLIC_KEY=');
        putenv('WGW_API_JWT_PRIVATE_KEY_PATH=');
        putenv('WGW_API_JWT_PUBLIC_KEY_PATH=');
        $_SERVER['REQUEST_METHOD'] = 'POST';
        $_SERVER['CONTENT_TYPE'] = 'application/json';

        ob_start();
        ApiKernel::tryRespond('', '/api/v1/auth/token');
        $raw = (string) ob_get_clean();
        $json = json_decode($raw, true);

        self::assertIsArray($json);
        self::assertContains($json['code'] ?? '', ['bad_request', 'unauthorized', 'config_error']);
    }
}
