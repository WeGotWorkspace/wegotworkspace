<?php

declare(strict_types=1);

namespace Tests\Feature\Admin;

use App\Models\Principal;
use App\Models\User;
use App\Services\Auth\AdminRoleResolver;
use App\Storage\WgwStorage;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\File;
use Tests\Support\WgwDatabaseTestCase;
use Tests\Support\WgwTestDisks;

final class UpdateStateEndpointTest extends WgwDatabaseTestCase
{
    private string $dataDir = '';

    protected function setUp(): void
    {
        parent::setUp();

        putenv('WGW_DISABLE_LOGIN_THROTTLE=1');
        $_ENV['WGW_DISABLE_LOGIN_THROTTLE'] = '1';

        $this->dataDir = storage_path('framework/testing/wgw-update-state-'.uniqid('', true));
        File::ensureDirectoryExists($this->dataDir.'/updates');
        WgwTestDisks::refresh($this->dataDir);
        $this->configureWgwJwtKeys();

        $this->seedAdminAlice();
    }

    protected function tearDown(): void
    {
        if ($this->dataDir !== '' && File::isDirectory($this->dataDir)) {
            File::deleteDirectory($this->dataDir);
        }

        parent::tearDown();
    }

    public function test_update_state_exposes_recent_progress_without_lock_file(): void
    {
        $token = $this->adminToken();
        $recentAt = date('c');

        app(WgwStorage::class)->data()->put(
            'updates/state.json',
            json_encode([
                'phase' => 'extracting',
                'current' => ['from' => '0.1.42', 'to' => '0.1.43', 'at' => $recentAt],
                'phase_progress' => [
                    'completed' => 100,
                    'total' => 200,
                    'percent' => 50,
                    'updatedAt' => $recentAt,
                ],
            ], JSON_UNESCAPED_SLASHES)."\n",
        );

        $this->withHeader('Authorization', 'Bearer '.$token)
            ->getJson('/api/v1/admin/updates/state')
            ->assertOk()
            ->assertJsonPath('inProgress', true)
            ->assertJsonPath('phase', 'extracting')
            ->assertJsonPath('phaseProgress.completed', 100)
            ->assertJsonPath('phaseProgress.total', 200);
    }

    public function test_update_state_clears_stale_orphan_progress_without_lock_file(): void
    {
        $token = $this->adminToken();
        $staleAt = date('c', time() - 600);

        app(WgwStorage::class)->data()->put(
            'updates/state.json',
            json_encode([
                'phase' => 'extracting',
                'current' => ['from' => '0.1.42', 'to' => '0.1.43', 'at' => $staleAt],
                'phase_progress' => [
                    'completed' => 6392,
                    'total' => 17564,
                    'percent' => 36,
                    'updatedAt' => $staleAt,
                ],
            ], JSON_UNESCAPED_SLASHES)."\n",
        );

        $this->withHeader('Authorization', 'Bearer '.$token)
            ->getJson('/api/v1/admin/updates/state')
            ->assertOk()
            ->assertJsonPath('inProgress', false)
            ->assertJsonPath('phase', null)
            ->assertJsonPath('phaseProgress', null);

        $raw = app(WgwStorage::class)->data()->get('updates/state.json');
        $decoded = json_decode($raw, true);
        $this->assertIsArray($decoded);
        $this->assertArrayNotHasKey('phase', $decoded);
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
}
