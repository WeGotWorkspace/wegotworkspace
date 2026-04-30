<?php

declare(strict_types=1);

namespace App\Api;

use App\Paths;

final class OpenApiDocument
{
    public static function build(string $webBase): array
    {
        $base = $webBase === '' ? '' : $webBase;
        $serverUrl = $base.'/api/v1';
        $path = Paths::appRoot().'/openapi/openapi.json';
        if (!is_readable($path)) {
            throw new \RuntimeException('OpenAPI spec file is missing.');
        }
        $raw = (string) file_get_contents($path);
        $spec = json_decode($raw, true);
        if (!is_array($spec)) {
            throw new \RuntimeException('OpenAPI spec is invalid JSON.');
        }
        self::ensureSchemaCoverage($spec);

        return self::replaceServerUrl($spec, $serverUrl);
    }

    /**
     * Ensure every operation has at least request/response schema coverage.
     *
     * @param array<string, mixed> $spec
     */
    private static function ensureSchemaCoverage(array &$spec): void
    {
        if (!is_array($spec['components'] ?? null)) {
            $spec['components'] = [];
        }
        if (!is_array($spec['components']['schemas'] ?? null)) {
            $spec['components']['schemas'] = [];
        }
        $schemas = &$spec['components']['schemas'];
        self::ensureComponentSchemas($schemas);

        $paths = &$spec['paths'];
        if (!is_array($paths)) {
            return;
        }
        foreach ($paths as $path => &$pathItem) {
            if (!is_array($pathItem)) {
                continue;
            }
            foreach ($pathItem as $method => &$operation) {
                if (!is_array($operation) || !in_array(strtolower((string) $method), ['get', 'post', 'put', 'patch', 'delete'], true)) {
                    continue;
                }
                self::ensureOperationRequestSchema($operation, strtoupper((string) $method), (string) $path);
                self::ensureOperationResponseSchemas($operation, (string) $path, strtoupper((string) $method));
            }
        }
    }

    /**
     * @param array<string, mixed> $operation
     */
    private static function ensureOperationRequestSchema(array &$operation, string $method, string $path): void
    {
        $preferredSchemaRef = self::preferredRequestSchemaRef($path, $method);
        if (!in_array($method, ['POST', 'PUT', 'PATCH', 'DELETE'], true)) {
            return;
        }
        if (!isset($operation['requestBody']) || !is_array($operation['requestBody'])) {
            if ($preferredSchemaRef === null) {
                return;
            }
            $operation['requestBody'] = [
                'required' => false,
                'content' => [
                    'application/json' => [
                        'schema' => ['$ref' => $preferredSchemaRef],
                    ],
                ],
            ];

            return;
        }
        if (!is_array($operation['requestBody']['content'] ?? null)) {
            $operation['requestBody']['content'] = [];
        }
        if (!is_array($operation['requestBody']['content']['application/json'] ?? null)) {
            $operation['requestBody']['content']['application/json'] = [];
        }
        if (!isset($operation['requestBody']['content']['application/json']['schema'])) {
            $operation['requestBody']['content']['application/json']['schema'] = [
                '$ref' => $preferredSchemaRef ?? '#/components/schemas/GenericObject',
            ];
        }
    }

    /**
     * @param array<string, mixed> $operation
     */
    private static function ensureOperationResponseSchemas(array &$operation, string $path, string $method): void
    {
        if (!is_array($operation['responses'] ?? null)) {
            $operation['responses'] = [
                '200' => ['description' => 'OK'],
            ];
        }
        foreach ($operation['responses'] as $code => &$response) {
            if (!is_array($response)) {
                $response = ['description' => 'Response'];
            }
            $status = (string) $code;
            if ($status === '204') {
                continue;
            }
            if (!is_array($response['content'] ?? null)) {
                $response['content'] = [];
            }
            $contentType = self::preferredResponseContentType($path, $method);
            if (!is_array($response['content'][$contentType] ?? null)) {
                $response['content'][$contentType] = [];
            }
            if (!isset($response['content'][$contentType]['schema'])) {
                if ($contentType === 'application/octet-stream') {
                    $response['content'][$contentType]['schema'] = ['$ref' => '#/components/schemas/BinaryPayload'];
                    continue;
                }
                if ($contentType === 'text/plain') {
                    $response['content'][$contentType]['schema'] = ['type' => 'string'];
                    continue;
                }
                $response['content'][$contentType]['schema'] = [
                    '$ref' => self::preferredResponseSchemaRef($path, $method) ?? '#/components/schemas/GenericObject',
                ];
            }
        }
    }

    private static function preferredResponseContentType(string $path, string $method): string
    {
        if ($method === 'GET' && in_array($path, ['/drive/download', '/mail/message/attachment', '/admin/updates/backups/{name}'], true)) {
            return 'application/octet-stream';
        }
        if ($path === '/drive/upload') {
            return 'text/plain';
        }

        return 'application/json';
    }

    private static function preferredRequestSchemaRef(string $path, string $method): ?string
    {
        return match (true) {
            $path === '/auth/revoke' && $method === 'POST' => '#/components/schemas/AuthRevokeRequest',
            $path === '/admin/users' && $method === 'POST' => '#/components/schemas/AdminUserCreateRequest',
            $path === '/admin/users/{username}' && $method === 'PATCH' => '#/components/schemas/AdminUserUpdateRequest',
            $path === '/admin/groups' && $method === 'POST' => '#/components/schemas/AdminGroupCreateRequest',
            $path === '/admin/groups/{group}' && $method === 'PATCH' => '#/components/schemas/AdminGroupUpdateRequest',
            $path === '/admin/settings' && $method === 'PUT' => '#/components/schemas/AdminSettingsSaveRequest',
            $path === '/admin/updates/apply' && $method === 'POST' => '#/components/schemas/UpdateApplyRequest',
            $path === '/installer/action' && $method === 'POST' => '#/components/schemas/InstallerActionRequest',
            $path === '/mail/config' && $method === 'PUT' => '#/components/schemas/MailConfigPutRequest',
            $path === '/mail/folders' && $method === 'POST' => '#/components/schemas/MailFolderCreateRequest',
            $path === '/mail/folders' && $method === 'PATCH' => '#/components/schemas/MailFolderMoveRequest',
            $path === '/mail/folders' && $method === 'DELETE' => '#/components/schemas/MailFolderDeleteRequest',
            $path === '/mail/message' && $method === 'PATCH' => '#/components/schemas/MailMessagePatchRequest',
            $path === '/mail/move' && $method === 'POST' => '#/components/schemas/MailMoveRequest',
            $path === '/mail/send' && $method === 'POST' => '#/components/schemas/MailSendRequest',
            $path === '/mail/draft' && $method === 'POST' => '#/components/schemas/MailDraftRequest',
            $path === '/drive/getdir' && $method === 'POST' => '#/components/schemas/DriveGetDirRequest',
            $path === '/drive/searchfiles' && $method === 'POST' => '#/components/schemas/DriveSearchRequest',
            $path === '/drive/changedir' && $method === 'POST' => '#/components/schemas/DriveChangeDirRequest',
            $path === '/drive/createnew' && $method === 'POST' => '#/components/schemas/DriveCreateRequest',
            $path === '/drive/renameitem' && $method === 'POST' => '#/components/schemas/DriveRenameRequest',
            $path === '/drive/deleteitems' && $method === 'POST' => '#/components/schemas/DriveDeleteItemsRequest',
            $path === '/notes/items' && $method === 'POST' => '#/components/schemas/NoteUpsertRequest',
            $path === '/notes/items/{id}' && $method === 'PUT' => '#/components/schemas/NoteUpsertRequest',
            $path === '/notes/items/{id}' && $method === 'DELETE' => '#/components/schemas/NoteDeleteRequest',
            $path === '/notes/notebooks' && $method === 'POST' => '#/components/schemas/NotebookCreateRequest',
            $path === '/notes/notebooks/{name}' && $method === 'PATCH' => '#/components/schemas/NotebookRenameRequest',
            $path === '/notes/notebooks/{name}' && $method === 'DELETE' => '#/components/schemas/NotebookDeleteRequest',
            $path === '/voice/join' && $method === 'POST' => '#/components/schemas/VoiceSignalRequest',
            $path === '/voice/poll' && $method === 'POST' => '#/components/schemas/VoiceSignalRequest',
            $path === '/voice/send' && $method === 'POST' => '#/components/schemas/VoiceSignalRequest',
            $path === '/voice/leave' && $method === 'POST' => '#/components/schemas/VoiceSignalRequest',
            $path === '/voice/chat' && $method === 'POST' => '#/components/schemas/VoiceSignalRequest',
            default => null,
        };
    }

    private static function preferredResponseSchemaRef(string $path, string $method): ?string
    {
        return match (true) {
            $path === '/health' && $method === 'GET' => '#/components/schemas/HealthResponse',
            $path === '/capabilities' && $method === 'GET' => '#/components/schemas/CapabilitiesResponse',
            $path === '/me' && $method === 'GET' => '#/components/schemas/Principal',
            $path === '/auth/revoke' && $method === 'POST' => '#/components/schemas/OkResponse',
            $path === '/admin/state' && $method === 'GET' => '#/components/schemas/AdminStateResponse',
            $path === '/admin/updates/state' && $method === 'GET' => '#/components/schemas/UpdateStateResponse',
            $path === '/admin/updates/check' && $method === 'POST' => '#/components/schemas/UpdateStateResponse',
            $path === '/admin/updates/apply' && $method === 'POST' => '#/components/schemas/UpdateApplyResponse',
            $path === '/admin/updates/cancel' && $method === 'POST' => '#/components/schemas/OkResponse',
            $path === '/admin/updates/log' && $method === 'GET' => '#/components/schemas/UpdateLogResponse',
            $path === '/admin/updates/log' && $method === 'DELETE' => '#/components/schemas/OkResponse',
            $path === '/admin/updates/backups/{name}' && $method === 'DELETE' => '#/components/schemas/UpdateStateResponse',
            $path === '/admin/groups/{group}/members/{username}' => '#/components/schemas/OkResponse',
            $path === '/admin/users' && $method === 'POST' => '#/components/schemas/OkResponse',
            $path === '/admin/groups' && $method === 'POST' => '#/components/schemas/OkResponse',
            $path === '/admin/users/{username}' => '#/components/schemas/OkResponse',
            $path === '/admin/groups/{group}' => '#/components/schemas/OkResponse',
            $path === '/admin/settings' && $method === 'PUT' => '#/components/schemas/AdminSettingsSaveResponse',
            $path === '/settings/state' && $method === 'GET' => '#/components/schemas/SettingsStateResponse',
            $path === '/settings/profile' && $method === 'PUT' => '#/components/schemas/SettingsStateResponse',
            $path === '/settings/mail' && $method === 'PUT' => '#/components/schemas/SettingsStateResponse',
            $path === '/mail/status' && $method === 'GET' => '#/components/schemas/MailStatusResponse',
            $path === '/mail/config' => '#/components/schemas/MailConfigResponse',
            $path === '/mail/folders' && $method === 'GET' => '#/components/schemas/MailFoldersResponse',
            $path === '/mail/folders' && in_array($method, ['POST', 'PATCH', 'DELETE'], true) => '#/components/schemas/OkResponse',
            $path === '/mail/messages' && $method === 'GET' => '#/components/schemas/MailMessagesResponse',
            $path === '/mail/messages/attachments' && $method === 'GET' => '#/components/schemas/MailAttachmentsResponse',
            $path === '/mail/message' && $method === 'GET' => '#/components/schemas/MailMessageResponse',
            $path === '/mail/message' && $method === 'PATCH' => '#/components/schemas/OkResponse',
            $path === '/mail/move' || $path === '/mail/send' || $path === '/mail/draft' => '#/components/schemas/OkResponse',
            $path === '/drive/user' && $method === 'GET' => '#/components/schemas/DriveUserResponse',
            $path === '/drive/getdir' && $method === 'POST' => '#/components/schemas/DriveListingResponse',
            $path === '/drive/searchfiles' && $method === 'POST' => '#/components/schemas/DriveListingResponse',
            $path === '/drive/changedir' && $method === 'POST' => '#/components/schemas/DriveCwdResponse',
            $path === '/drive/createnew' || $path === '/drive/renameitem' || $path === '/drive/deleteitems' => '#/components/schemas/DriveMutationResponse',
            $path === '/notes/state' && $method === 'GET' => '#/components/schemas/NotesStateResponse',
            $path === '/notes/capabilities' && $method === 'GET' => '#/components/schemas/NotesCapabilitiesResponse',
            $path === '/notes/items' && $method === 'GET' => '#/components/schemas/NotesItemsResponse',
            $path === '/notes/items' && $method === 'POST' => '#/components/schemas/NoteMutationResponse',
            $path === '/notes/items/{id}' && $method === 'PUT' => '#/components/schemas/NoteMutationResponse',
            $path === '/notes/items/{id}' && $method === 'DELETE' => '#/components/schemas/OkResponse',
            $path === '/notes/items/{id}/archive' || $path === '/notes/items/{id}/restore' => '#/components/schemas/NoteMutationResponse',
            $path === '/notes/notebooks' && $method === 'GET' => '#/components/schemas/NotebookListResponse',
            $path === '/notes/notebooks' && $method === 'POST' => '#/components/schemas/NotebookMutationResponse',
            $path === '/notes/notebooks/{name}' => '#/components/schemas/NotebookMutationResponse',
            $path === '/office/capabilities' && $method === 'GET' => '#/components/schemas/OfficeCapabilitiesResponse',
            $path === '/home/state' && $method === 'GET' => '#/components/schemas/HomeStateResponse',
            $path === '/dav/capabilities' && $method === 'GET' => '#/components/schemas/DavCapabilitiesResponse',
            $path === '/installer/bootstrap' && $method === 'GET' => '#/components/schemas/InstallerBootstrapResponse',
            $path === '/installer/state' && $method === 'GET' => '#/components/schemas/InstallerStateResponse',
            $path === '/installer/action' && $method === 'POST' => '#/components/schemas/InstallerActionResponse',
            default => null,
        };
    }

    /**
     * @param array<string, mixed> $schemas
     */
    private static function ensureComponentSchemas(array &$schemas): void
    {
        $defs = [
            'GenericObject' => ['type' => 'object', 'properties' => []],
            'OkResponse' => ['type' => 'object', 'properties' => ['ok' => ['type' => 'boolean']]],
            'HealthResponse' => ['type' => 'object', 'properties' => ['status' => ['type' => 'string'], 'apiVersion' => ['type' => 'string'], 'timestamp' => ['type' => 'string']]],
            'CapabilitiesResponse' => ['type' => 'object', 'properties' => ['apiVersion' => ['type' => 'string'], 'auth' => ['type' => 'object'], 'domains' => ['type' => 'array', 'items' => ['type' => 'object']]]],
            'InstallerBootstrapResponse' => ['type' => 'object', 'properties' => ['csrf' => ['type' => 'string'], 'state' => ['type' => 'object']]],
            'InstallerStateResponse' => ['type' => 'object', 'properties' => ['installed' => ['type' => 'boolean'], 'maintenance' => ['type' => 'boolean'], 'state' => ['type' => 'object']]],
            'InstallerActionResponse' => ['type' => 'object', 'properties' => ['ok' => ['type' => 'boolean'], 'error' => ['type' => 'string'], 'redirect' => ['type' => 'string'], 'csrf' => ['type' => 'string'], 'state' => ['type' => 'object']]],
            'InstallerActionRequest' => ['type' => 'object', 'properties' => ['action' => ['type' => 'string'], 'payload' => ['type' => 'object']]],
            'AuthRevokeRequest' => ['type' => 'object', 'properties' => ['refresh_token' => ['type' => 'string']]],
            'AdminUserCreateRequest' => ['type' => 'object', 'properties' => ['username' => ['type' => 'string'], 'password' => ['type' => 'string'], 'displayName' => ['type' => 'string'], 'email' => ['type' => 'string']], 'required' => ['username', 'password']],
            'AdminUserUpdateRequest' => ['type' => 'object', 'properties' => ['displayName' => ['type' => 'string'], 'email' => ['type' => 'string'], 'password' => ['type' => 'string']]],
            'AdminGroupCreateRequest' => ['type' => 'object', 'properties' => ['slug' => ['type' => 'string'], 'displayName' => ['type' => 'string']], 'required' => ['slug']],
            'AdminGroupUpdateRequest' => ['type' => 'object', 'properties' => ['members' => ['type' => 'array', 'items' => ['type' => 'string']]]],
            'AdminSettingsSaveRequest' => ['type' => 'object', 'properties' => ['values' => ['type' => 'object']]],
            'AdminStateResponse' => ['type' => 'object', 'properties' => ['me' => ['type' => 'object'], 'users' => ['type' => 'array', 'items' => ['type' => 'object']], 'groups' => ['type' => 'array', 'items' => ['type' => 'object']], 'settings' => ['type' => 'object'], 'updates' => ['type' => 'object']]],
            'UpdateStateResponse' => ['type' => 'object', 'properties' => ['installedVersion' => ['type' => 'string'], 'updateAvailable' => ['type' => 'boolean']]],
            'UpdateApplyResponse' => ['type' => 'object', 'properties' => ['ok' => ['type' => 'boolean'], 'version' => ['type' => 'string'], 'message' => ['type' => 'string']]],
            'UpdateApplyRequest' => ['type' => 'object', 'properties' => ['version' => ['type' => 'string']]],
            'UpdateLogResponse' => ['type' => 'object', 'properties' => ['lines' => ['type' => 'array', 'items' => ['type' => 'string']]]],
            'AdminSettingsSaveResponse' => ['type' => 'object', 'properties' => ['ok' => ['type' => 'boolean'], 'saved' => ['type' => 'array', 'items' => ['type' => 'string']]]],
            'SettingsStateResponse' => ['type' => 'object', 'properties' => ['user' => ['type' => 'object'], 'groups' => ['type' => 'array', 'items' => ['type' => 'object']], 'mail' => ['type' => 'object'], 'mailServer' => ['type' => 'object'], 'logoutUrl' => ['type' => 'string']]],
            'MailStatusResponse' => ['type' => 'object', 'properties' => ['extImap' => ['type' => 'boolean'], 'serversConfigured' => ['type' => 'boolean'], 'accountConfigured' => ['type' => 'boolean'], 'ready' => ['type' => 'boolean']]],
            'MailConfigResponse' => ['type' => 'object', 'properties' => ['config' => ['type' => 'object']]],
            'MailFoldersResponse' => ['type' => 'object', 'properties' => ['folders' => ['type' => 'array', 'items' => ['type' => 'object']]]],
            'MailMessagesResponse' => ['type' => 'object', 'properties' => ['messages' => ['type' => 'array', 'items' => ['type' => 'object']], 'hasMore' => ['type' => 'boolean']]],
            'MailAttachmentsResponse' => ['type' => 'object', 'properties' => ['items' => ['type' => 'array', 'items' => ['type' => 'object']]]],
            'MailMessageResponse' => ['type' => 'object', 'properties' => ['message' => ['type' => 'object']]],
            'MailConfigPutRequest' => ['type' => 'object', 'properties' => ['identity' => ['type' => 'object'], 'servers' => ['type' => 'object'], 'account' => ['type' => 'object']]],
            'MailFolderCreateRequest' => ['type' => 'object', 'properties' => ['name' => ['type' => 'string'], 'parentMailbox' => ['type' => 'string']], 'required' => ['name']],
            'MailFolderMoveRequest' => ['type' => 'object', 'properties' => ['folder' => ['type' => 'string'], 'parentMailbox' => ['type' => 'string']], 'required' => ['folder']],
            'MailFolderDeleteRequest' => ['type' => 'object', 'properties' => ['folder' => ['type' => 'string']], 'required' => ['folder']],
            'MailMessagePatchRequest' => ['type' => 'object', 'properties' => ['folder' => ['type' => 'string'], 'uid' => ['type' => 'integer'], 'read' => ['type' => 'boolean'], 'starred' => ['type' => 'boolean']], 'required' => ['folder', 'uid']],
            'MailMoveRequest' => ['type' => 'object', 'properties' => ['fromFolder' => ['type' => 'string'], 'toFolder' => ['type' => 'string'], 'uid' => ['type' => 'integer']], 'required' => ['fromFolder', 'toFolder', 'uid']],
            'MailSendRequest' => ['type' => 'object', 'properties' => ['to' => ['type' => 'string'], 'subject' => ['type' => 'string'], 'body' => ['type' => 'string'], 'cc' => ['type' => 'string'], 'bcc' => ['type' => 'string'], 'attachments' => ['type' => 'array', 'items' => ['type' => 'object']]], 'required' => ['to']],
            'MailDraftRequest' => ['type' => 'object', 'properties' => ['to' => ['type' => 'string'], 'subject' => ['type' => 'string'], 'body' => ['type' => 'string'], 'cc' => ['type' => 'string'], 'bcc' => ['type' => 'string'], 'attachments' => ['type' => 'array', 'items' => ['type' => 'object']]]],
            'DriveGetDirRequest' => ['type' => 'object', 'properties' => ['dir' => ['type' => 'string']]],
            'DriveSearchRequest' => ['type' => 'object', 'properties' => ['q' => ['type' => 'string'], 'limit' => ['type' => 'integer']]],
            'DriveChangeDirRequest' => ['type' => 'object', 'properties' => ['to' => ['type' => 'string']]],
            'DriveCreateRequest' => ['type' => 'object', 'properties' => ['name' => ['type' => 'string'], 'type' => ['type' => 'string']]],
            'DriveRenameRequest' => ['type' => 'object', 'properties' => ['destination' => ['type' => 'string'], 'from' => ['type' => 'string'], 'to' => ['type' => 'string']]],
            'DriveDeleteItemsRequest' => ['type' => 'object', 'properties' => ['items' => ['type' => 'array', 'items' => ['type' => 'object']]]],
            'DriveUserResponse' => ['type' => 'object', 'properties' => ['data' => ['type' => 'object']]],
            'DriveListingResponse' => ['type' => 'object', 'properties' => ['data' => ['type' => 'object']]],
            'DriveCwdResponse' => ['type' => 'object', 'properties' => ['data' => ['type' => 'object']]],
            'DriveMutationResponse' => ['type' => 'object', 'properties' => ['data' => ['type' => 'string']]],
            'NotesCapabilitiesResponse' => ['type' => 'object', 'properties' => ['enabled' => ['type' => 'boolean'], 'distReady' => ['type' => 'boolean'], 'baseUri' => ['type' => 'string']]],
            'NotesStateResponse' => ['type' => 'object', 'properties' => ['baseUri' => ['type' => 'string'], 'username' => ['type' => 'string'], 'displayName' => ['type' => 'string'], 'logoutUrl' => ['type' => 'string'], 'notesPath' => ['type' => 'string'], 'filesEnabled' => ['type' => 'boolean'], 'distReady' => ['type' => 'boolean']]],
            'NotesItemsResponse' => ['type' => 'object', 'properties' => ['items' => ['type' => 'array', 'items' => ['type' => 'object']]]],
            'NoteMutationResponse' => ['type' => 'object', 'properties' => ['ok' => ['type' => 'boolean'], 'item' => ['type' => 'object']]],
            'NoteUpsertRequest' => ['type' => 'object', 'properties' => ['id' => ['type' => 'string'], 'notebook' => ['type' => 'string'], 'title' => ['type' => 'string'], 'body' => ['type' => 'string'], 'tags' => ['type' => 'array', 'items' => ['type' => 'string']], 'starred' => ['type' => 'boolean'], 'archived' => ['type' => 'boolean']]],
            'NoteDeleteRequest' => ['type' => 'object', 'properties' => ['notebook' => ['type' => 'string'], 'archived' => ['type' => 'boolean']]],
            'NotebookListResponse' => ['type' => 'object', 'properties' => ['items' => ['type' => 'array', 'items' => ['type' => 'object']]]],
            'NotebookMutationResponse' => ['type' => 'object', 'properties' => ['ok' => ['type' => 'boolean'], 'name' => ['type' => 'string'], 'from' => ['type' => 'string'], 'to' => ['type' => 'string'], 'mode' => ['type' => 'string']]],
            'NotebookCreateRequest' => ['type' => 'object', 'properties' => ['name' => ['type' => 'string']]],
            'NotebookRenameRequest' => ['type' => 'object', 'properties' => ['name' => ['type' => 'string']]],
            'NotebookDeleteRequest' => ['type' => 'object', 'properties' => ['mode' => ['type' => 'string', 'enum' => ['archive', 'move', 'purge']], 'target' => ['type' => 'string']]],
            'VoiceSignalRequest' => ['type' => 'object', 'properties' => ['room' => ['type' => 'string'], 'peerId' => ['type' => 'string'], 'target' => ['type' => 'string'], 'message' => ['type' => 'string'], 'payload' => ['type' => 'object']]],
            'OfficeCapabilitiesResponse' => ['type' => 'object', 'properties' => ['enabled' => ['type' => 'boolean'], 'indexReady' => ['type' => 'boolean'], 'editorReady' => ['type' => 'boolean']]],
            'HomeStateResponse' => ['type' => 'object', 'properties' => ['username' => ['type' => 'string'], 'isAdmin' => ['type' => 'boolean'], 'availability' => ['type' => 'object']]],
            'DavCapabilitiesResponse' => ['type' => 'object', 'properties' => ['baseUri' => ['type' => 'string'], 'filesEnabled' => ['type' => 'boolean'], 'calendarEnabled' => ['type' => 'boolean'], 'contactsEnabled' => ['type' => 'boolean']]],
        ];
        foreach ($defs as $name => $schema) {
            if (!isset($schemas[$name])) {
                $schemas[$name] = $schema;
            }
        }
    }

    /**
     * @param array<string, mixed> $spec
     *
     * @return array<string, mixed>
     */
    private static function replaceServerUrl(array $spec, string $serverUrl): array
    {
        foreach ($spec as $key => $value) {
            if (is_array($value)) {
                $spec[$key] = self::replaceServerUrl($value, $serverUrl);
            } elseif (is_string($value) && $value === '__SERVER_URL__') {
                $spec[$key] = $serverUrl;
            }
        }

        return $spec;
    }
}
