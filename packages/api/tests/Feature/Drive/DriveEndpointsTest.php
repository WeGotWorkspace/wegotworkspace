<?php

declare(strict_types=1);

namespace Tests\Feature\Drive;

use App\Models\Principal;
use App\Models\User;
use App\Storage\WgwStorage;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\File;
use Tests\Support\AuthTestKeys;
use Tests\Support\SqliteWgwSchema;
use Tests\TestCase;

final class DriveEndpointsTest extends TestCase
{
    private string $dataDir = '';

    protected function setUp(): void
    {
        parent::setUp();

        putenv('WGW_DISABLE_LOGIN_THROTTLE=1');
        $_ENV['WGW_DISABLE_LOGIN_THROTTLE'] = '1';

        $this->dataDir = storage_path('framework/testing/wgw-drive-'.uniqid('', true));
        File::ensureDirectoryExists($this->dataDir.'/files/users/alice');
        config(['wgw.data_dir' => $this->dataDir]);

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
        SqliteWgwSchema::applyDriveTables();

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

        app(WgwStorage::class)->files()->put('users/alice/welcome.txt', 'hello');
    }

    protected function tearDown(): void
    {
        if ($this->dataDir !== '' && File::isDirectory($this->dataDir)) {
            File::deleteDirectory($this->dataDir);
        }

        parent::tearDown();
    }

    public function test_drive_user_listing_create_and_star_flow(): void
    {
        $token = $this->issueToken();

        $user = $this->withBearer($token)->getJson('/api/v1/drive/user');
        $user->assertOk()
            ->assertJsonPath('data.username', 'alice')
            ->assertJsonPath('data.name', 'Alice')
            ->assertJsonPath('data.roots', ['/users', '/groups']);

        $listing = $this->withBearer($token)->postJson('/api/v1/drive/getdir', [
            'dir' => '/users/alice',
        ]);
        $listing->assertOk()
            ->assertJsonPath('data.location', '/users/alice/')
            ->assertJsonFragment(['name' => 'welcome.txt', 'type' => 'file']);

        $create = $this->withBearer($token)->postJson('/api/v1/drive/createnew', [
            'cwd' => '/users/alice',
            'name' => 'Projects',
            'type' => 'dir',
        ]);
        $create->assertOk()->assertJsonPath('data', 'Created');

        $star = $this->withBearer($token)->postJson('/api/v1/drive/stars', [
            'path' => '/users/alice/welcome.txt',
            'starred' => true,
        ]);
        $star->assertOk()->assertJsonPath('data', 'Updated');

        $stars = $this->withBearer($token)->getJson('/api/v1/drive/stars');
        $stars->assertOk()
            ->assertJsonPath('data.paths', ['/users/alice/welcome.txt']);
    }

    private function issueToken(): string
    {
        return (string) $this->postJson('/api/v1/auth/token', [
            'username' => 'alice',
            'password' => 'secret',
        ])->json('access_token');
    }

    private function withBearer(string $token): static
    {
        return $this->withHeader('Authorization', 'Bearer '.$token);
    }
}
