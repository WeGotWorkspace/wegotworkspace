<?php

declare(strict_types=1);

namespace Tests\Api;

use App\Api\OpenApiDocument;
use PHPUnit\Framework\TestCase;

final class OpenApiDocumentTest extends TestCase
{
    public function testBuildLoadsSpecAndInjectsServerUrl(): void
    {
        $doc = OpenApiDocument::build('/app');
        self::assertSame('3.1.0', $doc['openapi'] ?? null);
        self::assertSame('/app/api/v1', $doc['servers'][0]['url'] ?? null);
        self::assertArrayHasKey('/auth/token', $doc['paths'] ?? []);
        self::assertArrayHasKey('/auth/refresh', $doc['paths'] ?? []);
        self::assertArrayHasKey('/auth/revoke', $doc['paths'] ?? []);
        self::assertArrayHasKey('/installer/state', $doc['paths'] ?? []);
        self::assertArrayHasKey('/dav/capabilities', $doc['paths'] ?? []);
    }
}
