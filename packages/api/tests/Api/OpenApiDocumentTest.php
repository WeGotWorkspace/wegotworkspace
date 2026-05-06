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
        self::assertArrayHasKey('/settings/profile', $doc['paths'] ?? []);
        self::assertArrayHasKey('/settings/mail', $doc['paths'] ?? []);
        self::assertArrayHasKey('/drive/getdir', $doc['paths'] ?? []);
        self::assertArrayHasKey('/drive/upload', $doc['paths'] ?? []);
        self::assertArrayHasKey('/notes/state', $doc['paths'] ?? []);
        self::assertArrayHasKey('/notes/items', $doc['paths'] ?? []);
        self::assertArrayHasKey('/notes/items/{id}', $doc['paths'] ?? []);
        self::assertArrayHasKey('/notes/items/{id}/archive', $doc['paths'] ?? []);
        self::assertArrayHasKey('/notes/items/{id}/restore', $doc['paths'] ?? []);
        self::assertArrayHasKey('/notes/notebooks', $doc['paths'] ?? []);
        self::assertArrayHasKey('/notes/notebooks/{name}', $doc['paths'] ?? []);
        self::assertArrayHasKey('/office/documents', $doc['paths'] ?? []);
        self::assertArrayHasKey('/dav/capabilities', $doc['paths'] ?? []);

        self::assertSame(
            '#/components/schemas/AuthTokenRequest',
            $doc['paths']['/auth/token']['post']['requestBody']['content']['application/json']['schema']['$ref'] ?? null
        );
        self::assertSame(
            '#/components/schemas/AuthRefreshRequest',
            $doc['paths']['/auth/refresh']['post']['requestBody']['content']['application/json']['schema']['$ref'] ?? null
        );
        self::assertSame(
            '#/components/schemas/AuthRevokeRequest',
            $doc['paths']['/auth/revoke']['post']['requestBody']['content']['application/json']['schema']['$ref'] ?? null
        );
        self::assertSame(
            '#/components/schemas/AdminStateResponse',
            $doc['paths']['/admin/state']['get']['responses']['200']['content']['application/json']['schema']['$ref'] ?? null
        );
        self::assertSame(
            '#/components/schemas/MailSendRequest',
            $doc['paths']['/mail/send']['post']['requestBody']['content']['application/json']['schema']['$ref'] ?? null
        );
        self::assertSame(
            '#/components/schemas/SettingsProfileRequest',
            $doc['paths']['/settings/profile']['put']['requestBody']['content']['application/json']['schema']['$ref'] ?? null
        );
        self::assertSame(
            '#/components/schemas/SettingsMailRequest',
            $doc['paths']['/settings/mail']['put']['requestBody']['content']['application/json']['schema']['$ref'] ?? null
        );
        self::assertSame(
            '#/components/schemas/NoteUpsertRequest',
            $doc['paths']['/notes/items']['post']['requestBody']['content']['application/json']['schema']['$ref'] ?? null
        );
        self::assertSame(
            '#/components/schemas/MailFolderCreateRequest',
            $doc['paths']['/mail/folders']['post']['requestBody']['content']['application/json']['schema']['$ref'] ?? null
        );
        self::assertSame(
            '#/components/schemas/DriveGetDirRequest',
            $doc['paths']['/drive/getdir']['post']['requestBody']['content']['application/json']['schema']['$ref'] ?? null
        );
        self::assertSame(
            '#/components/schemas/VoiceSignalRequest',
            $doc['paths']['/voice/join']['post']['requestBody']['content']['application/json']['schema']['$ref'] ?? null
        );
        self::assertSame(
            '#/components/schemas/OfficeDocumentCreateRequest',
            $doc['paths']['/office/documents']['post']['requestBody']['content']['application/json']['schema']['$ref'] ?? null
        );
        self::assertSame(
            '#/components/schemas/OfficeDocumentUpdateRequest',
            $doc['paths']['/office/documents']['put']['requestBody']['content']['application/json']['schema']['$ref'] ?? null
        );
        self::assertSame(
            '#/components/schemas/OfficeDocumentMutationResponse',
            $doc['paths']['/office/documents']['post']['responses']['200']['content']['application/json']['schema']['$ref'] ?? null
        );
        self::assertIsArray(
            $doc['components']['schemas']['MailFolderCreateRequest']['example'] ?? null
        );
        self::assertIsArray(
            $doc['components']['schemas']['AuthTokenRequest']['example'] ?? null
        );
        self::assertSame(
            '#/components/schemas/BinaryPayload',
            $doc['paths']['/drive/download']['get']['responses']['200']['content']['application/octet-stream']['schema']['$ref'] ?? null
        );
        self::assertIsArray($doc['components']['schemas']['GenericObject']['properties'] ?? null);
        self::assertSame(
            '#/components/schemas/MailMessageListItem',
            $doc['components']['schemas']['MailMessagesResponse']['properties']['messages']['items']['$ref'] ?? null
        );
        self::assertSame(
            '#/components/schemas/MailAttachmentListItem',
            $doc['components']['schemas']['MailAttachmentsResponse']['properties']['items']['items']['$ref'] ?? null
        );
    }
}
