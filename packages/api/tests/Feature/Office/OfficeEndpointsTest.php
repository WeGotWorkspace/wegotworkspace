<?php

declare(strict_types=1);

namespace Tests\Feature\Office;

use App\Models\Principal;
use App\Models\User;
use App\Storage\WgwStorage;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\File;
use Tests\Support\AuthTestKeys;
use Tests\Support\SqliteWgwSchema;
use Tests\Support\WgwTestDisks;
use Tests\TestCase;

final class OfficeEndpointsTest extends TestCase
{
    private string $dataDir = '';

    protected function setUp(): void
    {
        parent::setUp();

        putenv('WGW_DISABLE_LOGIN_THROTTLE=1');
        $_ENV['WGW_DISABLE_LOGIN_THROTTLE'] = '1';

        $this->dataDir = storage_path('framework/testing/wgw-office-'.uniqid('', true));
        File::ensureDirectoryExists($this->dataDir.'/files/users/alice');
        WgwTestDisks::refresh($this->dataDir);

        config([
            'database.connections.wgw' => [
                'driver' => 'sqlite',
                'database' => ':memory:',
                'prefix' => '',
                'foreign_key_constraints' => true,
            ],
        ]);
        DB::purge('wgw');

        $keys = AuthTestKeys::rsaPair();
        config([
            'wgw.jwt.private_key' => $keys['private_key'],
            'wgw.jwt.public_key' => $keys['public_key'],
            'wgw.jwt.issuer' => $keys['issuer'],
            'wgw.jwt.audience' => $keys['audience'],
            'wgw.jwt.kid' => $keys['kid'],
        ]);

        SqliteWgwSchema::applyCoreTables();
        SqliteWgwSchema::applyAuthTables();

        User::query()->create([
            'username' => 'alice',
            'digesta1' => '',
            'digest' => password_hash('secret', PASSWORD_DEFAULT),
        ]);
        Principal::query()->create([
            'uri' => 'principals/alice',
            'email' => 'alice@example.test',
            'displayname' => 'Alice',
        ]);
    }

    protected function tearDown(): void
    {
        if ($this->dataDir !== '' && File::isDirectory($this->dataDir)) {
            File::deleteDirectory($this->dataDir);
        }

        parent::tearDown();
    }

    public function test_office_capabilities_session_and_document_mutations(): void
    {
        $token = (string) $this->postJson('/api/v1/auth/token', [
            'username' => 'alice',
            'password' => 'secret',
        ])->json('access_token');

        $headers = ['Authorization' => 'Bearer '.$token];

        $this->getJson('/api/v1/office/capabilities', $headers)
            ->assertOk()
            ->assertJsonPath('enabled', true)
            ->assertJsonStructure(['enabled', 'indexReady', 'editorReady']);

        $this->postJson('/api/v1/office/session', [], $headers)
            ->assertOk()
            ->assertJsonPath('ok', true);

        $path = '/users/alice/Report.docx';
        $content = base64_encode('fake-docx-bytes');

        $this->postJson('/api/v1/office/documents', [
            'path' => $path,
            'content_base64' => $content,
        ], $headers)
            ->assertOk()
            ->assertJsonPath('ok', true)
            ->assertJsonPath('path', $path);

        $storage = app(WgwStorage::class);
        $this->assertSame('fake-docx-bytes', $storage->files()->get('users/alice/Report.docx'));

        $updated = base64_encode('updated');
        $this->putJson('/api/v1/office/documents', [
            'path' => $path,
            'content_base64' => $updated,
        ], $headers)
            ->assertOk()
            ->assertJsonPath('bytes', 7);

        $this->assertSame('updated', $storage->files()->get('users/alice/Report.docx'));
    }
}
