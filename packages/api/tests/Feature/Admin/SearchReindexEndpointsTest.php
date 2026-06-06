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

final class SearchReindexEndpointsTest extends WgwDatabaseTestCase
{
    private string $dataDir = '';

    protected function setUp(): void
    {
        parent::setUp();

        putenv('WGW_DISABLE_LOGIN_THROTTLE=1');
        $_ENV['WGW_DISABLE_LOGIN_THROTTLE'] = '1';

        $this->dataDir = storage_path('framework/testing/wgw-admin-search-'.uniqid('', true));
        File::ensureDirectoryExists($this->dataDir.'/files/users/alice');
        WgwTestDisks::refresh($this->dataDir);
        $this->configureWgwJwtKeys();

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
        $adminGroup = Principal::query()->create([
            'uri' => AdminRoleResolver::ADMIN_GROUP_URI,
            'displayname' => 'Administrators',
        ]);
        DB::connection('wgw')->table('groupmembers')->insert([
            'principal_id' => $adminGroup->id,
            'member_id' => $alice->id,
        ]);
    }

    protected function tearDown(): void
    {
        if ($this->dataDir !== '' && File::isDirectory($this->dataDir)) {
            File::deleteDirectory($this->dataDir);
        }

        parent::tearDown();
    }

    public function test_admin_can_run_and_read_search_reindex_state(): void
    {
        app(WgwStorage::class)->files()->put('users/alice/admin-search.txt', 'Search endpoint smoke test');
        $token = $this->issueToken();

        $run = $this->withHeader('Authorization', 'Bearer '.$token)
            ->postJson('/api/v1/admin/search/jobs');
        $run->assertOk()
            ->assertJsonPath('ok', true)
            ->assertJsonPath('message', 'Search reindex completed.');

        $state = $this->withHeader('Authorization', 'Bearer '.$token)
            ->getJson('/api/v1/admin/search/jobs/current');
        $state->assertOk()
            ->assertJsonPath('inProgress', false)
            ->assertJsonPath('lastResult.ok', true);
    }

    public function test_non_admin_cannot_run_search_reindex(): void
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

        $token = (string) $this->postJson('/api/v1/auth/token', [
            'username' => 'bob',
            'password' => 'secret',
        ])->json('access_token');

        $this->withHeader('Authorization', 'Bearer '.$token)
            ->postJson('/api/v1/admin/search/jobs')
            ->assertForbidden();
    }

    private function issueToken(): string
    {
        return (string) $this->postJson('/api/v1/auth/token', [
            'username' => 'alice',
            'password' => 'secret',
        ])->json('access_token');
    }
}
