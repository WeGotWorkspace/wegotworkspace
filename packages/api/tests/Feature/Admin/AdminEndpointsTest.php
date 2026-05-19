<?php

declare(strict_types=1);

namespace Tests\Feature\Admin;

use App\Models\Principal;
use App\Models\User;
use App\Services\Auth\AdminRoleResolver;
use App\Storage\WgwStorage;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\File;
use Tests\Support\AuthTestKeys;
use Tests\Support\SqliteWgwSchema;
use Tests\Support\WgwTestDisks;
use Tests\TestCase;

final class AdminEndpointsTest extends TestCase
{
    private string $dataDir = '';

    protected function setUp(): void
    {
        parent::setUp();

        putenv('WGW_DISABLE_LOGIN_THROTTLE=1');
        $_ENV['WGW_DISABLE_LOGIN_THROTTLE'] = '1';

        $this->dataDir = storage_path('framework/testing/wgw-admin-'.uniqid('', true));
        File::ensureDirectoryExists($this->dataDir.'/updates/backup');
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

        $this->seedAdminAlice();
        $this->seedBobUser();
    }

    protected function tearDown(): void
    {
        if ($this->dataDir !== '' && File::isDirectory($this->dataDir)) {
            File::deleteDirectory($this->dataDir);
        }

        parent::tearDown();
    }

    public function test_admin_state_log_and_group_membership(): void
    {
        $token = $this->adminToken();

        app(WgwStorage::class)->data()->put('updates/process.log', "[2026-01-01T00:00:00+00:00] test line\n");

        $state = $this->withHeader('Authorization', 'Bearer '.$token)
            ->getJson('/api/v1/admin/state');
        $state->assertOk()
            ->assertJsonPath('currentUser', 'alice')
            ->assertJsonStructure([
                'users',
                'groups',
                'mail',
                'voice',
                'apps',
                'webdav',
                'updates' => ['installedVersion', 'schemaVersion', 'backups'],
                'logoutUrl',
            ]);

        $log = $this->withHeader('Authorization', 'Bearer '.$token)
            ->getJson('/api/v1/admin/updates/log');
        $log->assertOk()->assertJsonPath('lines.0', '[2026-01-01T00:00:00+00:00] test line');

        $this->withHeader('Authorization', 'Bearer '.$token)
            ->deleteJson('/api/v1/admin/updates/log')
            ->assertOk()
            ->assertJsonPath('ok', true)
            ->assertJsonPath('lines', []);

        $this->withHeader('Authorization', 'Bearer '.$token)
            ->getJson('/api/v1/admin/updates/state')
            ->assertOk()
            ->assertJsonStructure([
                'installedVersion',
                'schemaVersion',
                'backups',
                'compatible',
                'updateAvailable',
            ]);

        $this->withHeader('Authorization', 'Bearer '.$token)
            ->putJson('/api/v1/admin/settings', [
                'values' => ['timezone' => 'Europe/Amsterdam'],
            ])
            ->assertOk()
            ->assertJsonPath('ok', true)
            ->assertJsonFragment(['saved' => ['timezone']]);

        $this->withHeader('Authorization', 'Bearer '.$token)
            ->putJson('/api/v1/admin/groups/administrators/members/bob')
            ->assertOk()
            ->assertJsonPath('ok', true);

        $state->assertOk();
        $this->withHeader('Authorization', 'Bearer '.$token)
            ->getJson('/api/v1/admin/state')
            ->assertOk()
            ->assertJsonFragment(['username' => 'bob']);
    }

    public function test_non_admin_cannot_access_admin_routes(): void
    {
        $token = (string) $this->postJson('/api/v1/auth/token', [
            'username' => 'bob',
            'password' => 'secret',
        ])->json('access_token');

        $this->withHeader('Authorization', 'Bearer '.$token)
            ->getJson('/api/v1/admin/state')
            ->assertForbidden();
    }

    private function adminToken(): string
    {
        return (string) $this->postJson('/api/v1/auth/token', [
            'username' => 'alice',
            'password' => 'secret',
        ])->json('access_token');
    }

    private function seedAdminAlice(): void
    {
        User::query()->create([
            'username' => 'alice',
            'digesta1' => '',
            'digest' => password_hash('secret', PASSWORD_DEFAULT),
        ]);
        $alice = Principal::query()->create([
            'uri' => 'principals/alice',
            'email' => 'alice@example.test',
            'displayname' => 'Alice',
        ]);
        $group = Principal::query()->create([
            'uri' => AdminRoleResolver::ADMIN_GROUP_URI,
            'displayname' => 'Administrators',
        ]);
        DB::connection('wgw')->table('groupmembers')->insert([
            'principal_id' => $group->id,
            'member_id' => $alice->id,
        ]);
    }

    private function seedBobUser(): void
    {
        User::query()->create([
            'username' => 'bob',
            'digesta1' => '',
            'digest' => password_hash('secret', PASSWORD_DEFAULT),
        ]);
        Principal::query()->create([
            'uri' => 'principals/bob',
            'email' => 'bob@example.test',
            'displayname' => 'Bob',
        ]);
    }
}
