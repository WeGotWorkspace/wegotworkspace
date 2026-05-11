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
        $path = dirname(Paths::packageSrc()).'/openapi/openapi.json';
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
        if ($preferredSchemaRef !== null) {
            $operation['requestBody']['content']['application/json']['schema'] = [
                '$ref' => $preferredSchemaRef,
            ];
        } elseif (!isset($operation['requestBody']['content']['application/json']['schema'])) {
            $operation['requestBody']['content']['application/json']['schema'] = [
                '$ref' => '#/components/schemas/GenericObject',
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
            $path === '/auth/token' && $method === 'POST' => '#/components/schemas/AuthTokenRequest',
            $path === '/auth/refresh' && $method === 'POST' => '#/components/schemas/AuthRefreshRequest',
            $path === '/auth/revoke' && $method === 'POST' => '#/components/schemas/AuthRevokeRequest',
            $path === '/admin/users' && $method === 'POST' => '#/components/schemas/AdminUserCreateRequest',
            $path === '/admin/users/{username}' && $method === 'PATCH' => '#/components/schemas/AdminUserUpdateRequest',
            $path === '/admin/groups' && $method === 'POST' => '#/components/schemas/AdminGroupCreateRequest',
            $path === '/admin/groups/{group}' && $method === 'PATCH' => '#/components/schemas/AdminGroupUpdateRequest',
            $path === '/admin/settings' && $method === 'PUT' => '#/components/schemas/AdminSettingsSaveRequest',
            $path === '/admin/updates/apply' && $method === 'POST' => '#/components/schemas/UpdateApplyRequest',
            $path === '/installer/action' && $method === 'POST' => '#/components/schemas/InstallerActionRequest',
            $path === '/settings/profile' && $method === 'PUT' => '#/components/schemas/SettingsProfileRequest',
            $path === '/settings/mail' && $method === 'PUT' => '#/components/schemas/SettingsMailRequest',
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
            $path === '/drive/stars' && $method === 'POST' => '#/components/schemas/DriveStarUpdateRequest',
            $path === '/notes/items' && $method === 'POST' => '#/components/schemas/NoteUpsertRequest',
            $path === '/notes/items/{id}' && $method === 'PUT' => '#/components/schemas/NoteUpsertRequest',
            $path === '/notes/items/{id}' && $method === 'DELETE' => '#/components/schemas/NoteDeleteRequest',
            $path === '/notes/notebooks' && $method === 'POST' => '#/components/schemas/NotebookCreateRequest',
            $path === '/notes/notebooks/{name}' && $method === 'PATCH' => '#/components/schemas/NotebookRenameRequest',
            $path === '/notes/notebooks/{name}' && $method === 'DELETE' => '#/components/schemas/NotebookDeleteRequest',
            $path === '/office/documents' && $method === 'POST' => '#/components/schemas/OfficeDocumentCreateRequest',
            $path === '/office/documents' && $method === 'PUT' => '#/components/schemas/OfficeDocumentUpdateRequest',
            $path === '/voice/join' && $method === 'POST' => '#/components/schemas/VoiceJoinRequest',
            $path === '/voice/poll' && $method === 'POST' => '#/components/schemas/VoicePollRequest',
            $path === '/voice/send' && $method === 'POST' => '#/components/schemas/VoiceSendRequest',
            $path === '/voice/leave' && $method === 'POST' => '#/components/schemas/VoiceLeaveRequest',
            $path === '/voice/chat' && $method === 'POST' => '#/components/schemas/VoiceChatRequest',
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
            $path === '/admin/updates/log' && $method === 'DELETE' => '#/components/schemas/UpdateLogClearResponse',
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
            $path === '/mail/folders' && in_array($method, ['POST', 'PATCH'], true) => '#/components/schemas/MailFolderMutationResponse',
            $path === '/mail/folders' && $method === 'DELETE' => '#/components/schemas/OkResponse',
            $path === '/mail/messages' && $method === 'GET' => '#/components/schemas/MailMessagesResponse',
            $path === '/mail/messages/attachments' && $method === 'GET' => '#/components/schemas/MailAttachmentsResponse',
            $path === '/mail/message' && $method === 'GET' => '#/components/schemas/MailMessageResponse',
            $path === '/mail/message' && $method === 'PATCH' => '#/components/schemas/OkResponse',
            $path === '/mail/move' => '#/components/schemas/OkResponse',
            $path === '/mail/send' => '#/components/schemas/MailSendResponse',
            $path === '/mail/draft' => '#/components/schemas/MailDraftResponse',
            $path === '/drive/user' && $method === 'GET' => '#/components/schemas/DriveUserResponse',
            $path === '/drive/getdir' && $method === 'POST' => '#/components/schemas/DriveListingResponse',
            $path === '/drive/searchfiles' && $method === 'POST' => '#/components/schemas/DriveListingResponse',
            $path === '/drive/changedir' && $method === 'POST' => '#/components/schemas/DriveCwdResponse',
            $path === '/drive/createnew' || $path === '/drive/renameitem' || $path === '/drive/deleteitems' => '#/components/schemas/DriveMutationResponse',
            $path === '/drive/stars' && $method === 'GET' => '#/components/schemas/DriveStarsResponse',
            $path === '/drive/stars' && $method === 'POST' => '#/components/schemas/DriveStarUpdateResponse',
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
            $path === '/office/documents' && in_array($method, ['POST', 'PUT'], true) => '#/components/schemas/OfficeDocumentMutationResponse',
            $path === '/home/state' && $method === 'GET' => '#/components/schemas/HomeStateResponse',
            $path === '/dav/capabilities' && $method === 'GET' => '#/components/schemas/DavCapabilitiesResponse',
            $path === '/voice/join' && $method === 'POST' => '#/components/schemas/VoiceJoinResponse',
            $path === '/voice/poll' && $method === 'POST' => '#/components/schemas/VoicePollResponse',
            $path === '/voice/send' && $method === 'POST' => '#/components/schemas/VoiceSendResponse',
            $path === '/voice/leave' && $method === 'POST' => '#/components/schemas/VoiceLeaveResponse',
            $path === '/voice/chat' && $method === 'POST' => '#/components/schemas/VoiceChatResponse',
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
            'BinaryPayload' => ['type' => 'string', 'format' => 'binary'],
            'OkResponse' => ['type' => 'object', 'properties' => ['ok' => ['type' => 'boolean']]],
            'HealthResponse' => ['type' => 'object', 'properties' => ['status' => ['type' => 'string'], 'apiVersion' => ['type' => 'string'], 'timestamp' => ['type' => 'string']]],
            'CapabilitiesResponse' => ['type' => 'object', 'properties' => ['apiVersion' => ['type' => 'string'], 'auth' => ['type' => 'object'], 'domains' => ['type' => 'array', 'items' => ['type' => 'object']]]],
            'InstallerStep' => ['type' => 'string', 'enum' => ['welcome', 'requirements', 'database', 'site', 'account', 'done', 'installed']],
            'InstallerDbDriver' => ['type' => 'string', 'enum' => ['sqlite', 'mysql']],
            'InstallerCheck' => ['type' => 'object', 'properties' => ['ok' => ['type' => 'boolean'], 'label' => ['type' => 'string'], 'detail' => ['type' => 'string']], 'required' => ['ok', 'label', 'detail']],
            'InstallerChecks' => ['type' => 'array', 'items' => ['$ref' => '#/components/schemas/InstallerCheck']],
            'InstallerDbState' => ['type' => 'object', 'properties' => ['sqlite_path' => ['type' => 'string'], 'mysql_host' => ['type' => 'string'], 'mysql_port' => ['type' => 'integer'], 'mysql_db' => ['type' => 'string'], 'mysql_user' => ['type' => 'string']]],
            'InstallerRuntimeState' => ['type' => 'object', 'properties' => ['step' => ['$ref' => '#/components/schemas/InstallerStep'], 'flash' => ['type' => ['string', 'null']], 'db_driver' => ['$ref' => '#/components/schemas/InstallerDbDriver'], 'db' => ['$ref' => '#/components/schemas/InstallerDbState'], 'timezone' => ['type' => 'string'], 'base_uri' => ['type' => 'string'], 'enable_files' => ['type' => 'boolean'], 'enable_calendars' => ['type' => 'boolean'], 'enable_contacts' => ['type' => 'boolean'], 'show_browser_ui' => ['type' => 'boolean'], 'checks' => ['$ref' => '#/components/schemas/InstallerChecks'], 'already_installed' => ['type' => 'boolean'], 'admin_updates_url' => ['type' => 'string']], 'required' => ['step', 'flash', 'db_driver', 'db', 'timezone', 'base_uri', 'enable_files', 'enable_calendars', 'enable_contacts', 'show_browser_ui', 'checks']],
            'InstallerBootstrapResponse' => ['type' => 'object', 'properties' => ['state' => ['$ref' => '#/components/schemas/InstallerRuntimeState']], 'required' => ['state']],
            'InstallerStateResponse' => ['type' => 'object', 'properties' => ['installed' => ['type' => 'boolean'], 'maintenance' => ['type' => 'boolean'], 'state' => ['$ref' => '#/components/schemas/InstallerRuntimeState']], 'required' => ['installed', 'maintenance', 'state']],
            'InstallerActionResponse' => ['type' => 'object', 'properties' => ['ok' => ['type' => 'boolean'], 'error' => ['type' => 'string'], 'redirect' => ['type' => 'string'], 'state' => ['$ref' => '#/components/schemas/InstallerRuntimeState']], 'required' => ['ok']],
            'InstallerAction' => ['type' => 'string', 'enum' => ['welcome_next', 'requirements_check', 'requirements_next', 'database_test', 'database_next', 'site_next', 'install']],
            'InstallerActionPayload' => ['type' => 'object', 'properties' => ['db_driver' => ['$ref' => '#/components/schemas/InstallerDbDriver'], 'sqlite_path' => ['type' => 'string'], 'mysql_host' => ['type' => 'string'], 'mysql_port' => ['type' => 'integer'], 'mysql_db' => ['type' => 'string'], 'mysql_user' => ['type' => 'string'], 'mysql_password' => ['type' => 'string'], 'base_uri_override' => ['type' => 'string'], 'timezone' => ['type' => 'string'], 'enable_files' => ['type' => 'boolean'], 'enable_calendars' => ['type' => 'boolean'], 'enable_contacts' => ['type' => 'boolean'], 'show_browser_ui' => ['type' => 'boolean'], 'username' => ['type' => 'string'], 'display_name' => ['type' => 'string'], 'email' => ['type' => 'string'], 'password' => ['type' => 'string'], 'password_confirm' => ['type' => 'string'], 'mail_enabled' => ['type' => 'boolean'], 'mail_imap_host' => ['type' => 'string'], 'mail_imap_port' => ['type' => 'string'], 'mail_imap_security' => ['type' => 'string'], 'mail_smtp_host' => ['type' => 'string'], 'mail_smtp_port' => ['type' => 'string'], 'mail_smtp_security' => ['type' => 'string'], 'voice_enabled' => ['type' => 'boolean'], 'voice_turn_url' => ['type' => 'string'], 'voice_turn_username' => ['type' => 'string'], 'voice_turn_credential' => ['type' => 'string']]],
            'InstallerActionRequest' => ['type' => 'object', 'properties' => ['action' => ['$ref' => '#/components/schemas/InstallerAction'], 'payload' => ['$ref' => '#/components/schemas/InstallerActionPayload']], 'required' => ['action'], 'example' => ['action' => 'database_test', 'payload' => ['db_driver' => 'sqlite', 'sqlite_path' => 'wgw-content/database.sqlite']]],
            'AuthTokenRequest' => ['type' => 'object', 'properties' => ['username' => ['type' => 'string'], 'password' => ['type' => 'string']], 'required' => ['username', 'password'], 'example' => ['username' => 'admin', 'password' => 'secret123']],
            'AuthRefreshRequest' => ['type' => 'object', 'properties' => ['refresh_token' => ['type' => 'string']], 'required' => ['refresh_token'], 'example' => ['refresh_token' => 'rt_abc123']],
            'AuthRevokeRequest' => ['type' => 'object', 'properties' => ['refresh_token' => ['type' => 'string']], 'example' => ['refresh_token' => 'rt_abc123']],
            'AdminUserGroupList' => ['type' => 'array', 'items' => ['type' => 'string']],
            'AdminUserCreateRequest' => ['type' => 'object', 'properties' => ['username' => ['type' => 'string'], 'password' => ['type' => 'string'], 'displayName' => ['type' => 'string'], 'email' => ['type' => 'string'], 'groups' => ['$ref' => '#/components/schemas/AdminUserGroupList']], 'required' => ['username', 'password'], 'example' => ['username' => 'alice', 'password' => 'strong-password', 'displayName' => 'Alice', 'email' => 'alice@example.test', 'groups' => ['principals/groups/support']]],
            'AdminUserUpdateRequest' => ['type' => 'object', 'properties' => ['displayName' => ['type' => 'string'], 'email' => ['type' => 'string'], 'password' => ['type' => 'string'], 'groups' => ['$ref' => '#/components/schemas/AdminUserGroupList']], 'example' => ['displayName' => 'Alice Cooper', 'email' => 'alice@example.test', 'groups' => ['principals/groups/support']]],
            'AdminGroupCreateRequest' => ['type' => 'object', 'properties' => ['slug' => ['type' => 'string'], 'displayName' => ['type' => 'string']], 'required' => ['slug'], 'example' => ['slug' => 'support', 'displayName' => 'Support']],
            'AdminGroupUpdateRequest' => ['type' => 'object', 'properties' => ['displayName' => ['type' => 'string'], 'members' => ['$ref' => '#/components/schemas/AdminUserGroupList']], 'example' => ['displayName' => 'Support Team', 'members' => ['alice', 'bob']]],
            'AdminSettingValue' => ['oneOf' => [['type' => 'string'], ['type' => 'integer'], ['type' => 'number'], ['type' => 'boolean'], ['type' => 'null']]],
            'AdminSettingsValueMap' => ['type' => 'object', 'additionalProperties' => ['$ref' => '#/components/schemas/AdminSettingValue']],
            'AdminSettingsSaveRequest' => ['type' => 'object', 'properties' => ['values' => ['$ref' => '#/components/schemas/AdminSettingsValueMap']], 'example' => ['values' => ['timezone' => 'UTC']]],
            'AdminUserSummary' => ['type' => 'object', 'properties' => ['id' => ['type' => 'string'], 'username' => ['type' => 'string'], 'email' => ['type' => 'string'], 'displayName' => ['type' => 'string'], 'groups' => ['$ref' => '#/components/schemas/AdminUserGroupList'], 'createdAt' => ['type' => 'string']], 'required' => ['id', 'username', 'email', 'displayName', 'groups', 'createdAt']],
            'AdminGroupSummary' => ['type' => 'object', 'properties' => ['id' => ['type' => 'string'], 'name' => ['type' => 'string'], 'displayName' => ['type' => 'string']], 'required' => ['id', 'name', 'displayName']],
            'AdminMailSettings' => ['type' => 'object', 'properties' => ['imapHost' => ['type' => 'string'], 'imapPort' => ['type' => 'integer'], 'imapSecurity' => ['type' => 'string'], 'smtpHost' => ['type' => 'string'], 'smtpPort' => ['type' => 'integer'], 'smtpSecurity' => ['type' => 'string']], 'required' => ['imapHost', 'imapPort', 'imapSecurity', 'smtpHost', 'smtpPort', 'smtpSecurity']],
            'AdminVoiceSettings' => ['type' => 'object', 'properties' => ['signalingUrl' => ['type' => 'string'], 'stunUrls' => ['type' => 'string'], 'turnUrls' => ['type' => 'string'], 'turnUsername' => ['type' => 'string'], 'turnPassword' => ['type' => 'string'], 'forceRelay' => ['type' => 'boolean']], 'required' => ['signalingUrl', 'stunUrls', 'turnUrls', 'turnUsername', 'turnPassword', 'forceRelay']],
            'AdminAppsSettings' => ['type' => 'object', 'properties' => ['calendars' => ['type' => 'boolean'], 'contacts' => ['type' => 'boolean']], 'required' => ['calendars', 'contacts']],
            'AdminWebdavSettings' => ['type' => 'object', 'properties' => ['sabreUi' => ['type' => 'boolean'], 'timezone' => ['type' => 'string'], 'baseUri' => ['type' => 'string'], 'authRealm' => ['type' => 'string']], 'required' => ['sabreUi', 'timezone', 'baseUri', 'authRealm']],
            'UpdateReleaseMetadata' => ['type' => 'object', 'properties' => ['version' => ['type' => 'string'], 'package_url' => ['type' => 'string'], 'checksum_sha256' => ['type' => 'string'], 'checksum_signature' => ['type' => 'string']], 'required' => ['version', 'package_url', 'checksum_sha256', 'checksum_signature']],
            'UpdateBackupItem' => ['type' => 'object', 'properties' => ['name' => ['type' => 'string'], 'sizeBytes' => ['type' => 'integer'], 'modifiedAt' => ['type' => ['string', 'null']], 'fromVersion' => ['type' => ['string', 'null']], 'toVersion' => ['type' => ['string', 'null']], 'format' => ['type' => 'string'], 'downloadable' => ['type' => 'boolean']], 'required' => ['name', 'sizeBytes', 'modifiedAt', 'fromVersion', 'toVersion', 'format', 'downloadable']],
            'UpdateCheckItem' => ['type' => 'object', 'properties' => ['ok' => ['type' => 'boolean'], 'label' => ['type' => 'string'], 'detail' => ['type' => 'string'], 'status' => ['type' => 'string']], 'required' => ['ok', 'label', 'detail']],
            'UpdateCurrentInfo' => ['type' => 'object', 'properties' => ['from' => ['type' => 'string'], 'to' => ['type' => 'string'], 'at' => ['type' => 'string']], 'required' => ['from', 'to', 'at']],
            'UpdateDownloadProgress' => ['type' => 'object', 'properties' => ['downloadedBytes' => ['type' => 'integer'], 'totalBytes' => ['type' => ['integer', 'null']], 'percent' => ['type' => ['integer', 'null']], 'updatedAt' => ['type' => 'string']], 'required' => ['downloadedBytes', 'totalBytes', 'percent', 'updatedAt']],
            'UpdatePhaseProgress' => ['type' => 'object', 'properties' => ['completed' => ['type' => 'integer'], 'total' => ['type' => 'integer'], 'percent' => ['type' => 'integer'], 'updatedAt' => ['type' => 'string']], 'required' => ['completed', 'total', 'percent', 'updatedAt']],
            'UpdateApplyResult' => ['type' => 'object', 'properties' => ['ok' => ['type' => 'boolean'], 'version' => ['type' => 'string'], 'message' => ['type' => 'string'], 'finishedAt' => ['type' => ['string', 'null']]], 'required' => ['ok', 'version', 'message', 'finishedAt']],
            'UpdateStateResponse' => ['type' => 'object', 'properties' => ['installedVersion' => ['type' => 'string'], 'schemaVersion' => ['type' => 'integer'], 'latest' => ['oneOf' => [['$ref' => '#/components/schemas/UpdateReleaseMetadata'], ['type' => 'null']]], 'updateAvailable' => ['type' => 'boolean'], 'compatible' => ['type' => 'boolean'], 'backups' => ['type' => 'array', 'items' => ['$ref' => '#/components/schemas/UpdateBackupItem']], 'checks' => ['type' => 'array', 'items' => ['$ref' => '#/components/schemas/UpdateCheckItem']], 'inProgress' => ['type' => 'boolean'], 'phase' => ['type' => ['string', 'null']], 'current' => ['oneOf' => [['$ref' => '#/components/schemas/UpdateCurrentInfo'], ['type' => 'null']]], 'download' => ['oneOf' => [['$ref' => '#/components/schemas/UpdateDownloadProgress'], ['type' => 'null']]], 'phaseProgress' => ['oneOf' => [['$ref' => '#/components/schemas/UpdatePhaseProgress'], ['type' => 'null']]], 'cancelRequested' => ['type' => 'boolean'], 'cancelAllowed' => ['type' => 'boolean'], 'lastCheckedAt' => ['type' => ['string', 'null']], 'lastCheckError' => ['type' => ['string', 'null']], 'lastResult' => ['oneOf' => [['$ref' => '#/components/schemas/UpdateApplyResult'], ['type' => 'null']]]], 'required' => ['installedVersion', 'schemaVersion', 'latest', 'updateAvailable', 'compatible', 'backups', 'checks', 'inProgress', 'phase', 'current', 'download', 'phaseProgress', 'cancelRequested', 'cancelAllowed', 'lastCheckedAt', 'lastCheckError', 'lastResult']],
            'AdminStateResponse' => ['type' => 'object', 'properties' => ['users' => ['type' => 'array', 'items' => ['$ref' => '#/components/schemas/AdminUserSummary']], 'groups' => ['type' => 'array', 'items' => ['$ref' => '#/components/schemas/AdminGroupSummary']], 'mail' => ['$ref' => '#/components/schemas/AdminMailSettings'], 'voice' => ['$ref' => '#/components/schemas/AdminVoiceSettings'], 'apps' => ['$ref' => '#/components/schemas/AdminAppsSettings'], 'webdav' => ['$ref' => '#/components/schemas/AdminWebdavSettings'], 'updates' => ['$ref' => '#/components/schemas/UpdateStateResponse'], 'currentUser' => ['type' => 'string'], 'logoutUrl' => ['type' => 'string']], 'required' => ['users', 'groups', 'mail', 'voice', 'apps', 'webdav', 'updates', 'currentUser', 'logoutUrl']],
            'UpdateApplyResponse' => ['$ref' => '#/components/schemas/UpdateApplyResult'],
            'UpdateApplyRequest' => ['type' => 'object', 'properties' => ['version' => ['type' => 'string']], 'example' => ['version' => '0.1.31']],
            'UpdateLogLineList' => ['type' => 'array', 'items' => ['type' => 'string']],
            'UpdateLogResponse' => ['type' => 'object', 'properties' => ['lines' => ['$ref' => '#/components/schemas/UpdateLogLineList']], 'required' => ['lines']],
            'UpdateLogClearResponse' => ['type' => 'object', 'properties' => ['ok' => ['type' => 'boolean'], 'lines' => ['$ref' => '#/components/schemas/UpdateLogLineList']], 'required' => ['ok', 'lines']],
            'AdminSavedSettingKeyList' => ['type' => 'array', 'items' => ['type' => 'string']],
            'AdminSettingsSaveResponse' => ['type' => 'object', 'properties' => ['ok' => ['type' => 'boolean'], 'saved' => ['$ref' => '#/components/schemas/AdminSavedSettingKeyList']], 'required' => ['ok', 'saved']],
            'SettingsUserProfile' => ['type' => 'object', 'properties' => ['username' => ['type' => 'string'], 'displayName' => ['type' => 'string'], 'email' => ['type' => 'string']], 'required' => ['username', 'displayName', 'email']],
            'SettingsUserGroup' => ['type' => 'object', 'properties' => ['id' => ['type' => 'string'], 'displayName' => ['type' => 'string']], 'required' => ['id', 'displayName']],
            'SettingsUserGroupList' => ['type' => 'array', 'items' => ['$ref' => '#/components/schemas/SettingsUserGroup']],
            'SettingsUserMail' => ['type' => 'object', 'properties' => ['imapUsername' => ['type' => 'string'], 'imapHasPassword' => ['type' => 'boolean']], 'required' => ['imapUsername', 'imapHasPassword']],
            'SettingsUserMailServer' => ['type' => 'object', 'properties' => ['imapHost' => ['type' => 'string'], 'imapPort' => ['type' => 'integer'], 'imapSecurity' => ['type' => 'string'], 'smtpHost' => ['type' => 'string'], 'smtpPort' => ['type' => 'integer'], 'smtpSecurity' => ['type' => 'string']], 'required' => ['imapHost', 'imapPort', 'imapSecurity', 'smtpHost', 'smtpPort', 'smtpSecurity']],
            'SettingsStateResponse' => ['type' => 'object', 'properties' => ['user' => ['$ref' => '#/components/schemas/SettingsUserProfile'], 'groups' => ['$ref' => '#/components/schemas/SettingsUserGroupList'], 'mail' => ['$ref' => '#/components/schemas/SettingsUserMail'], 'mailServer' => ['$ref' => '#/components/schemas/SettingsUserMailServer'], 'logoutUrl' => ['type' => 'string']], 'required' => ['user', 'groups', 'mail', 'mailServer', 'logoutUrl']],
            'SettingsProfileRequest' => ['type' => 'object', 'properties' => ['displayName' => ['type' => 'string'], 'email' => ['type' => 'string'], 'password' => ['type' => 'string']], 'example' => ['displayName' => 'Alice Example', 'email' => 'alice@example.test']],
            'SettingsMailRequest' => ['type' => 'object', 'properties' => ['imapUsername' => ['type' => 'string'], 'imapPassword' => ['type' => 'string']], 'example' => ['imapUsername' => 'alice@example.test', 'imapPassword' => 'secret']],
            'MailStatusResponse' => ['type' => 'object', 'properties' => ['extImap' => ['type' => 'boolean'], 'serversConfigured' => ['type' => 'boolean'], 'accountConfigured' => ['type' => 'boolean'], 'configured' => ['type' => 'boolean'], 'ready' => ['type' => 'boolean']]],
            'MailIdentity' => ['type' => 'object', 'properties' => ['displayName' => ['type' => 'string'], 'emailAddress' => ['type' => 'string']]],
            'MailServerEndpoint' => ['type' => 'object', 'properties' => ['host' => ['type' => 'string'], 'port' => ['type' => 'integer'], 'security' => ['type' => 'string']]],
            'MailServerSettings' => ['type' => 'object', 'properties' => ['imap' => ['$ref' => '#/components/schemas/MailServerEndpoint'], 'smtp' => ['$ref' => '#/components/schemas/MailServerEndpoint']]],
            'MailAccountConfig' => ['type' => 'object', 'properties' => ['imapUsername' => ['type' => 'string'], 'imapHasPassword' => ['type' => 'boolean']]],
            'MailPublicConfig' => ['type' => 'object', 'properties' => ['identity' => ['$ref' => '#/components/schemas/MailIdentity'], 'servers' => ['$ref' => '#/components/schemas/MailServerSettings'], 'account' => ['$ref' => '#/components/schemas/MailAccountConfig']]],
            'MailConfigResponse' => ['type' => 'object', 'properties' => ['ok' => ['type' => 'boolean'], 'config' => ['$ref' => '#/components/schemas/MailPublicConfig']]],
            'MailAddress' => ['type' => 'object', 'properties' => ['name' => ['type' => 'string'], 'email' => ['type' => 'string']]],
            'MailAttachmentSummary' => ['type' => 'object', 'properties' => ['id' => ['type' => 'string'], 'name' => ['type' => 'string'], 'size' => ['type' => 'integer'], 'type' => ['type' => 'string'], 'part' => ['type' => 'string']]],
            'MailAddressList' => ['type' => 'array', 'items' => ['$ref' => '#/components/schemas/MailAddress']],
            'MailAttachmentSummaryList' => ['type' => 'array', 'items' => ['$ref' => '#/components/schemas/MailAttachmentSummary']],
            'MailAttachmentListItem' => ['type' => 'object', 'properties' => ['id' => ['type' => 'string'], 'attachments' => ['$ref' => '#/components/schemas/MailAttachmentSummaryList']]],
            'MailAttachmentList' => ['type' => 'array', 'items' => ['$ref' => '#/components/schemas/MailAttachmentListItem']],
            'MailFolder' => ['type' => 'object', 'properties' => ['id' => ['type' => 'string'], 'name' => ['type' => 'string'], 'parentId' => ['type' => ['string', 'null']], 'system' => ['type' => ['string', 'null']], 'virtual' => ['type' => 'boolean'], 'unread' => ['type' => 'integer']]],
            'MailFolderList' => ['type' => 'array', 'items' => ['$ref' => '#/components/schemas/MailFolder']],
            'MailFoldersResponse' => ['type' => 'object', 'properties' => ['folders' => ['type' => 'array', 'items' => ['$ref' => '#/components/schemas/MailFolder']]]],
            'MailMessageListItem' => ['type' => 'object', 'properties' => ['id' => ['type' => 'string'], 'folderId' => ['type' => 'string'], 'mailbox' => ['type' => 'string'], 'from' => ['$ref' => '#/components/schemas/MailAddress'], 'to' => ['type' => 'array', 'items' => ['$ref' => '#/components/schemas/MailAddress']], 'cc' => ['type' => 'array', 'items' => ['$ref' => '#/components/schemas/MailAddress']], 'subject' => ['type' => 'string'], 'preview' => ['type' => 'string'], 'body' => ['type' => 'string'], 'date' => ['type' => 'string'], 'read' => ['type' => 'boolean'], 'starred' => ['type' => 'boolean'], 'attachments' => ['type' => 'array', 'items' => ['$ref' => '#/components/schemas/MailAttachmentSummary']]]],
            'MailMessageList' => ['type' => 'array', 'items' => ['$ref' => '#/components/schemas/MailMessageListItem']],
            'MailMessageDetail' => ['type' => 'object', 'allOf' => [['$ref' => '#/components/schemas/MailMessageListItem'], ['type' => 'object', 'properties' => ['bodyHtml' => ['type' => ['string', 'null']]]]]],
            'MailMessagesResponse' => ['type' => 'object', 'properties' => ['messages' => ['type' => 'array', 'items' => ['$ref' => '#/components/schemas/MailMessageListItem']], 'hasMore' => ['type' => 'boolean']]],
            'MailAttachmentsResponse' => ['type' => 'object', 'properties' => ['items' => ['type' => 'array', 'items' => ['$ref' => '#/components/schemas/MailAttachmentListItem']]]],
            'MailMessageResponse' => ['type' => 'object', 'properties' => ['message' => ['$ref' => '#/components/schemas/MailMessageDetail']]],
            'MailFolderMutationResponse' => ['type' => 'object', 'properties' => ['ok' => ['type' => 'boolean'], 'mailbox' => ['type' => 'string'], 'id' => ['type' => 'string']]],
            'MailAttachmentReport' => ['type' => 'object', 'properties' => ['attached' => ['type' => 'integer'], 'skipped' => ['type' => 'integer'], 'totalBytes' => ['type' => 'integer']]],
            'MailSendResponse' => ['type' => 'object', 'properties' => ['ok' => ['type' => 'boolean'], 'attachment_report' => ['$ref' => '#/components/schemas/MailAttachmentReport'], 'sent_copy_failed' => ['type' => 'string']]],
            'MailDraftResponse' => ['type' => 'object', 'properties' => ['ok' => ['type' => 'boolean'], 'attachment_report' => ['$ref' => '#/components/schemas/MailAttachmentReport']]],
            'MailConfigPutImapInput' => ['type' => 'object', 'properties' => ['username' => ['type' => 'string'], 'password' => ['type' => 'string']]],
            'MailConfigPutRequest' => ['type' => 'object', 'properties' => ['imap' => ['$ref' => '#/components/schemas/MailConfigPutImapInput']], 'example' => ['imap' => ['username' => 'alice@example.test', 'password' => 'secret']]],
            'MailFolderCreateRequest' => ['type' => 'object', 'properties' => ['name' => ['type' => 'string'], 'parentMailbox' => ['type' => 'string']], 'required' => ['name'], 'example' => ['name' => 'Projects', 'parentMailbox' => 'INBOX']],
            'MailFolderMoveRequest' => ['type' => 'object', 'properties' => ['folder' => ['type' => 'string'], 'parentMailbox' => ['type' => 'string']], 'required' => ['folder'], 'example' => ['folder' => 'UHJvamVjdHM', 'parentMailbox' => 'SU5CT1g']],
            'MailFolderDeleteRequest' => ['type' => 'object', 'properties' => ['folder' => ['type' => 'string']], 'required' => ['folder'], 'example' => ['folder' => 'UHJvamVjdHM']],
            'MailMessagePatchRequest' => ['type' => 'object', 'properties' => ['folder' => ['type' => 'string'], 'uid' => ['type' => 'integer'], 'read' => ['type' => 'boolean'], 'starred' => ['type' => 'boolean']], 'required' => ['folder', 'uid'], 'example' => ['folder' => 'SU5CT1g', 'uid' => 42, 'read' => true, 'starred' => false]],
            'MailMoveRequest' => ['type' => 'object', 'properties' => ['fromFolder' => ['type' => 'string'], 'toFolder' => ['type' => 'string'], 'uid' => ['type' => 'integer']], 'required' => ['fromFolder', 'toFolder', 'uid'], 'example' => ['fromFolder' => 'SU5CT1g', 'toFolder' => 'trash', 'uid' => 42]],
            'MailComposeAttachmentUpload' => ['type' => 'object', 'properties' => ['filename' => ['type' => 'string'], 'mimeType' => ['type' => 'string'], 'contentBase64' => ['type' => 'string']]],
            'MailComposeAttachmentUploadList' => ['type' => 'array', 'items' => ['$ref' => '#/components/schemas/MailComposeAttachmentUpload']],
            'MailSendRequest' => ['type' => 'object', 'properties' => ['to' => ['type' => 'string'], 'subject' => ['type' => 'string'], 'body' => ['type' => 'string'], 'cc' => ['type' => 'string'], 'bcc' => ['type' => 'string'], 'attachments' => ['$ref' => '#/components/schemas/MailComposeAttachmentUploadList']], 'required' => ['to'], 'example' => ['to' => 'bob@example.test', 'subject' => 'Hello', 'body' => 'Hi Bob']],
            'MailDraftRequest' => ['type' => 'object', 'properties' => ['to' => ['type' => 'string'], 'subject' => ['type' => 'string'], 'body' => ['type' => 'string'], 'cc' => ['type' => 'string'], 'bcc' => ['type' => 'string'], 'attachments' => ['$ref' => '#/components/schemas/MailComposeAttachmentUploadList']], 'example' => ['subject' => 'Draft subject', 'body' => 'Draft body']],
            'DriveGetDirRequest' => ['type' => 'object', 'properties' => ['dir' => ['type' => 'string']], 'example' => ['dir' => '/users/alice/']],
            'DriveSearchRequest' => ['type' => 'object', 'properties' => ['q' => ['type' => 'string'], 'limit' => ['type' => 'integer']], 'example' => ['q' => 'invoice', 'limit' => 25]],
            'DriveChangeDirRequest' => ['type' => 'object', 'properties' => ['to' => ['type' => 'string']], 'example' => ['to' => '/users/alice/Documents']],
            'DriveEntryType' => ['type' => 'string', 'enum' => ['dir', 'file']],
            'DriveRootPath' => ['type' => 'string', 'enum' => ['/users', '/groups']],
            'DriveRootPathList' => ['type' => 'array', 'items' => ['$ref' => '#/components/schemas/DriveRootPath']],
            'DriveDirectoryEntry' => ['type' => 'object', 'properties' => ['type' => ['$ref' => '#/components/schemas/DriveEntryType'], 'path' => ['type' => 'string'], 'name' => ['type' => 'string'], 'size' => ['type' => 'integer'], 'time' => ['type' => 'integer'], 'permissions' => ['type' => 'integer']], 'required' => ['type', 'path', 'name', 'size', 'time', 'permissions']],
            'DriveDirectoryEntryList' => ['type' => 'array', 'items' => ['$ref' => '#/components/schemas/DriveDirectoryEntry']],
            'DriveDirectoryData' => ['type' => 'object', 'properties' => ['location' => ['type' => 'string'], 'files' => ['$ref' => '#/components/schemas/DriveDirectoryEntryList']], 'required' => ['location', 'files']],
            'DriveCwdData' => ['type' => 'object', 'properties' => ['cwd' => ['type' => 'string']], 'required' => ['cwd']],
            'DriveUserData' => ['type' => 'object', 'properties' => ['username' => ['type' => 'string'], 'name' => ['type' => 'string'], 'role' => ['type' => 'string', 'enum' => ['user']], 'roots' => ['$ref' => '#/components/schemas/DriveRootPathList']], 'required' => ['username', 'name', 'role', 'roots']],
            'DriveCreateRequest' => ['type' => 'object', 'properties' => ['cwd' => ['type' => 'string'], 'name' => ['type' => 'string'], 'type' => ['$ref' => '#/components/schemas/DriveEntryType']], 'required' => ['name', 'type'], 'example' => ['cwd' => '/users/alice', 'name' => 'Q2', 'type' => 'dir']],
            'DriveRenameRequest' => ['type' => 'object', 'properties' => ['destination' => ['type' => 'string'], 'from' => ['type' => 'string'], 'to' => ['type' => 'string']], 'required' => ['destination', 'from', 'to'], 'example' => ['destination' => '/users/alice', 'from' => 'Q1', 'to' => 'Q1-Archive']],
            'DriveDeleteItem' => ['type' => 'object', 'properties' => ['path' => ['type' => 'string'], 'type' => ['$ref' => '#/components/schemas/DriveEntryType']], 'required' => ['path']],
            'DriveDeleteItemList' => ['type' => 'array', 'items' => ['$ref' => '#/components/schemas/DriveDeleteItem']],
            'DriveDeleteItemsRequest' => ['type' => 'object', 'properties' => ['items' => ['$ref' => '#/components/schemas/DriveDeleteItemList']], 'required' => ['items'], 'example' => ['items' => [['path' => '/users/alice/Q1-Archive', 'type' => 'dir']]]],
            'DriveUserResponse' => ['type' => 'object', 'properties' => ['data' => ['$ref' => '#/components/schemas/DriveUserData']], 'required' => ['data']],
            'DriveListingResponse' => ['type' => 'object', 'properties' => ['data' => ['$ref' => '#/components/schemas/DriveDirectoryData']], 'required' => ['data']],
            'DriveCwdResponse' => ['type' => 'object', 'properties' => ['data' => ['$ref' => '#/components/schemas/DriveCwdData']], 'required' => ['data']],
            'DriveMutationResult' => ['type' => 'string', 'enum' => ['Created', 'Renamed', 'Deleted']],
            'DriveMutationResponse' => ['type' => 'object', 'properties' => ['data' => ['$ref' => '#/components/schemas/DriveMutationResult']], 'required' => ['data']],
            'DriveStarPathList' => ['type' => 'array', 'items' => ['type' => 'string']],
            'DriveStarsData' => ['type' => 'object', 'properties' => ['paths' => ['$ref' => '#/components/schemas/DriveStarPathList']], 'required' => ['paths']],
            'DriveStarsResponse' => ['type' => 'object', 'properties' => ['data' => ['$ref' => '#/components/schemas/DriveStarsData']], 'required' => ['data']],
            'DriveStarUpdateRequest' => ['type' => 'object', 'properties' => ['path' => ['type' => 'string'], 'starred' => ['type' => 'boolean']], 'required' => ['path', 'starred'], 'example' => ['path' => '/groups/team/invoice.pdf', 'starred' => true]],
            'DriveStarUpdateResult' => ['type' => 'string', 'enum' => ['Updated']],
            'DriveStarUpdateResponse' => ['type' => 'object', 'properties' => ['data' => ['$ref' => '#/components/schemas/DriveStarUpdateResult']], 'required' => ['data']],
            'NotesCapabilitiesResponse' => ['type' => 'object', 'properties' => ['enabled' => ['type' => 'boolean'], 'distReady' => ['type' => 'boolean'], 'baseUri' => ['type' => 'string']], 'required' => ['enabled', 'distReady', 'baseUri']],
            'NotesStateResponse' => ['type' => 'object', 'properties' => ['baseUri' => ['type' => 'string'], 'username' => ['type' => 'string'], 'displayName' => ['type' => 'string'], 'logoutUrl' => ['type' => 'string'], 'notesPath' => ['type' => 'string'], 'filesEnabled' => ['type' => 'boolean'], 'distReady' => ['type' => 'boolean']], 'required' => ['baseUri', 'username', 'displayName', 'logoutUrl', 'notesPath', 'filesEnabled', 'distReady']],
            'NoteTagList' => ['type' => 'array', 'items' => ['type' => 'string']],
            'NoteItem' => ['type' => 'object', 'properties' => ['id' => ['type' => 'string'], 'username' => ['type' => 'string'], 'notebook' => ['type' => 'string'], 'title' => ['type' => 'string'], 'body' => ['type' => 'string'], 'tags' => ['$ref' => '#/components/schemas/NoteTagList'], 'starred' => ['type' => ['boolean', 'null']], 'archived' => ['type' => 'boolean'], 'updatedAt' => ['type' => 'string']], 'required' => ['id', 'username', 'notebook', 'title', 'body', 'tags', 'archived', 'updatedAt']],
            'NoteItemList' => ['type' => 'array', 'items' => ['$ref' => '#/components/schemas/NoteItem']],
            'NotesItemsResponse' => ['type' => 'object', 'properties' => ['items' => ['type' => 'array', 'items' => ['$ref' => '#/components/schemas/NoteItem']]], 'required' => ['items']],
            'NoteMutationResponse' => ['type' => 'object', 'properties' => ['ok' => ['type' => 'boolean'], 'item' => ['$ref' => '#/components/schemas/NoteItem']], 'required' => ['ok', 'item']],
            'NoteUpsertRequest' => ['type' => 'object', 'properties' => ['id' => ['type' => 'string'], 'notebook' => ['type' => 'string'], 'title' => ['type' => 'string'], 'body' => ['type' => 'string'], 'tags' => ['$ref' => '#/components/schemas/NoteTagList'], 'starred' => ['type' => 'boolean'], 'archived' => ['type' => 'boolean']], 'required' => ['notebook', 'title', 'body', 'tags', 'starred', 'archived'], 'example' => ['id' => 'n123', 'notebook' => 'General', 'title' => 'Roadmap', 'body' => 'Draft roadmap', 'tags' => ['planning'], 'starred' => true]],
            'NoteDeleteRequest' => ['type' => 'object', 'properties' => ['notebook' => ['type' => 'string'], 'archived' => ['type' => 'boolean']], 'required' => ['notebook', 'archived'], 'example' => ['notebook' => 'General', 'archived' => false]],
            'NotebookListItem' => ['type' => 'object', 'properties' => ['name' => ['type' => 'string'], 'activeCount' => ['type' => 'integer'], 'archivedCount' => ['type' => 'integer']], 'required' => ['name', 'activeCount', 'archivedCount']],
            'NotebookListItemList' => ['type' => 'array', 'items' => ['$ref' => '#/components/schemas/NotebookListItem']],
            'NotebookListResponse' => ['type' => 'object', 'properties' => ['items' => ['type' => 'array', 'items' => ['$ref' => '#/components/schemas/NotebookListItem']]], 'required' => ['items']],
            'NotebookMutationResponse' => ['type' => 'object', 'properties' => ['ok' => ['type' => 'boolean'], 'name' => ['type' => 'string'], 'from' => ['type' => 'string'], 'to' => ['type' => 'string'], 'mode' => ['type' => 'string'], 'target' => ['type' => 'string']], 'required' => ['ok']],
            'NotebookCreateRequest' => ['type' => 'object', 'properties' => ['name' => ['type' => 'string']], 'required' => ['name'], 'example' => ['name' => 'Ideas']],
            'NotebookRenameRequest' => ['type' => 'object', 'properties' => ['name' => ['type' => 'string']], 'required' => ['name'], 'example' => ['name' => 'Projects']],
            'NotebookDeleteRequest' => ['type' => 'object', 'properties' => ['mode' => ['type' => 'string', 'enum' => ['archive', 'move', 'purge']], 'target' => ['type' => 'string']], 'required' => ['mode'], 'example' => ['mode' => 'move', 'target' => 'Archive']],
            'VoiceSessionKey' => ['type' => 'string', 'pattern' => '^[a-f0-9]{32}$'],
            'VoicePeer' => ['type' => 'object', 'properties' => ['id' => ['type' => 'string'], 'name' => ['type' => 'string']], 'required' => ['id', 'name']],
            'VoicePeerList' => ['type' => 'array', 'items' => ['$ref' => '#/components/schemas/VoicePeer']],
            'VoiceMessageType' => ['type' => 'string', 'enum' => ['offer', 'answer', 'ice', 'bye', 'chat']],
            'VoiceSendType' => ['type' => 'string', 'enum' => ['offer', 'answer', 'ice', 'bye']],
            'VoiceSdpPayload' => ['type' => 'object', 'properties' => ['sdp' => ['type' => 'string'], 'type' => ['type' => 'string']], 'required' => ['sdp']],
            'VoiceIcePayload' => ['type' => 'object', 'properties' => ['candidate' => ['type' => 'string'], 'sdpMid' => ['type' => 'string'], 'sdpMLineIndex' => ['type' => 'integer'], 'usernameFragment' => ['type' => 'string']], 'required' => ['candidate']],
            'VoiceChatPayload' => ['type' => 'object', 'properties' => ['text' => ['type' => 'string']], 'required' => ['text']],
            'VoiceByePayload' => ['type' => 'object', 'properties' => ['reason' => ['type' => 'string']]],
            'VoiceSignalPayload' => ['oneOf' => [['$ref' => '#/components/schemas/VoiceSdpPayload'], ['$ref' => '#/components/schemas/VoiceIcePayload'], ['$ref' => '#/components/schemas/VoiceChatPayload'], ['$ref' => '#/components/schemas/VoiceByePayload'], ['type' => 'null']]],
            'VoiceSignalEnvelope' => ['type' => 'object', 'properties' => ['from' => ['type' => 'string'], 'type' => ['$ref' => '#/components/schemas/VoiceMessageType'], 'payload' => ['$ref' => '#/components/schemas/VoiceSignalPayload']], 'required' => ['from', 'type', 'payload']],
            'VoiceSignalEnvelopeList' => ['type' => 'array', 'items' => ['$ref' => '#/components/schemas/VoiceSignalEnvelope']],
            'VoiceJoinRequest' => ['type' => 'object', 'properties' => ['room' => ['type' => 'string', 'pattern' => '^[A-Za-z0-9_-]{4,64}$'], 'peerId' => ['type' => 'string', 'pattern' => '^[A-Za-z0-9_-]{4,64}$'], 'name' => ['type' => 'string', 'maxLength' => 64], 'sessionKey' => ['$ref' => '#/components/schemas/VoiceSessionKey']], 'required' => ['room', 'peerId'], 'example' => ['room' => 'daily-room', 'peerId' => 'peer1234', 'name' => 'Guest User']],
            'VoicePollRequest' => ['type' => 'object', 'properties' => ['room' => ['type' => 'string', 'pattern' => '^[A-Za-z0-9_-]{4,64}$'], 'peerId' => ['type' => 'string', 'pattern' => '^[A-Za-z0-9_-]{4,64}$'], 'sessionKey' => ['$ref' => '#/components/schemas/VoiceSessionKey']], 'required' => ['room', 'peerId'], 'example' => ['room' => 'daily-room', 'peerId' => 'peer1234']],
            'VoiceSendRequest' => ['type' => 'object', 'properties' => ['room' => ['type' => 'string', 'pattern' => '^[A-Za-z0-9_-]{4,64}$'], 'from' => ['type' => 'string', 'pattern' => '^[A-Za-z0-9_-]{4,64}$'], 'to' => ['type' => 'string', 'pattern' => '^[A-Za-z0-9_-]{4,64}$'], 'type' => ['$ref' => '#/components/schemas/VoiceSendType'], 'payload' => ['$ref' => '#/components/schemas/VoiceSignalPayload'], 'sessionKey' => ['$ref' => '#/components/schemas/VoiceSessionKey']], 'required' => ['room', 'from', 'to', 'type'], 'example' => ['room' => 'daily-room', 'from' => 'peer-a', 'to' => 'peer-b', 'type' => 'offer', 'payload' => ['sdp' => 'v=0...']]],
            'VoiceLeaveRequest' => ['type' => 'object', 'properties' => ['room' => ['type' => 'string', 'pattern' => '^[A-Za-z0-9_-]{4,64}$'], 'peerId' => ['type' => 'string', 'pattern' => '^[A-Za-z0-9_-]{4,64}$'], 'sessionKey' => ['$ref' => '#/components/schemas/VoiceSessionKey']], 'required' => ['room', 'peerId'], 'example' => ['room' => 'daily-room', 'peerId' => 'peer1234']],
            'VoiceChatRequest' => ['type' => 'object', 'properties' => ['room' => ['type' => 'string', 'pattern' => '^[A-Za-z0-9_-]{4,64}$'], 'from' => ['type' => 'string', 'pattern' => '^[A-Za-z0-9_-]{4,64}$'], 'text' => ['type' => 'string', 'maxLength' => 2000], 'sessionKey' => ['$ref' => '#/components/schemas/VoiceSessionKey']], 'required' => ['room', 'from', 'text'], 'example' => ['room' => 'daily-room', 'from' => 'peer1234', 'text' => 'Hello team']],
            'VoiceJoinResponse' => ['type' => 'object', 'properties' => ['peers' => ['$ref' => '#/components/schemas/VoicePeerList'], 'sessionKey' => ['type' => ['string', 'null']]], 'required' => ['peers', 'sessionKey']],
            'VoicePollResponse' => ['type' => 'object', 'properties' => ['peers' => ['$ref' => '#/components/schemas/VoicePeerList'], 'messages' => ['$ref' => '#/components/schemas/VoiceSignalEnvelopeList']], 'required' => ['peers', 'messages']],
            'VoiceSendResponse' => ['type' => 'object', 'properties' => ['ok' => ['type' => 'boolean']], 'required' => ['ok']],
            'VoiceLeaveResponse' => ['type' => 'object', 'properties' => ['ok' => ['type' => 'boolean']], 'required' => ['ok']],
            'VoiceChatResponse' => ['type' => 'object', 'properties' => ['ok' => ['type' => 'boolean'], 'delivered' => ['type' => 'integer']], 'required' => ['ok', 'delivered']],
            'OfficeCapabilitiesResponse' => ['type' => 'object', 'properties' => ['enabled' => ['type' => 'boolean'], 'indexReady' => ['type' => 'boolean'], 'editorReady' => ['type' => 'boolean']]],
            'OfficeDocumentCreateRequest' => ['type' => 'object', 'properties' => ['path' => ['type' => 'string'], 'content_base64' => ['type' => 'string']], 'required' => ['path'], 'example' => ['path' => '/users/alice/New Document.docx']],
            'OfficeDocumentUpdateRequest' => ['type' => 'object', 'properties' => ['path' => ['type' => 'string'], 'content_base64' => ['type' => 'string']], 'required' => ['path', 'content_base64'], 'example' => ['path' => '/users/alice/New Document.docx', 'content_base64' => 'UEsDBBQAAAAIAAAAIQAAAAAAAAAAAAAAAAAJAAAAd29yZC9QSw==']],
            'OfficeDocumentMutationResponse' => ['type' => 'object', 'properties' => ['ok' => ['type' => 'boolean'], 'path' => ['type' => 'string'], 'bytes' => ['type' => 'integer']]],
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
