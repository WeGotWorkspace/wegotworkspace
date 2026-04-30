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
        self::assertArrayHasKey('/installer/bootstrap', $doc['paths'] ?? []);
        self::assertArrayHasKey('/installer/action', $doc['paths'] ?? []);
        self::assertArrayHasKey('/admin/updates/log', $doc['paths'] ?? []);
        self::assertArrayHasKey('/admin/updates/backups/{name}', $doc['paths'] ?? []);
        self::assertArrayHasKey('/admin/groups/{group}/members/{username}', $doc['paths'] ?? []);
        self::assertArrayHasKey('/mail/folders', $doc['paths'] ?? []);
        self::assertArrayHasKey('/mail/messages', $doc['paths'] ?? []);
        self::assertArrayHasKey('/mail/message', $doc['paths'] ?? []);
        self::assertArrayHasKey('/drive/getdir', $doc['paths'] ?? []);
        self::assertArrayHasKey('/drive/upload', $doc['paths'] ?? []);
        self::assertArrayHasKey('/notes/state', $doc['paths'] ?? []);
        self::assertArrayHasKey('/notes/items', $doc['paths'] ?? []);
        self::assertArrayHasKey('/notes/items/{id}', $doc['paths'] ?? []);
        self::assertArrayHasKey('/notes/items/{id}/archive', $doc['paths'] ?? []);
        self::assertArrayHasKey('/notes/items/{id}/restore', $doc['paths'] ?? []);
        self::assertArrayHasKey('/notes/notebooks', $doc['paths'] ?? []);
        self::assertArrayHasKey('/notes/notebooks/{name}', $doc['paths'] ?? []);
        self::assertArrayHasKey('/dav/capabilities', $doc['paths'] ?? []);
    }
}
