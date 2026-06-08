<?php

declare(strict_types=1);

namespace Tests\Feature\Admin;

use App\Models\Principal;
use App\Services\Auth\AdminRoleResolver;
use App\Storage\WgwStorage;
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

        $this->seedWgwUser('alice', displayName: 'Alice');
        $alice = Principal::forUsername('alice');
        $this->assertNotNull($alice);
        $adminGroup = $this->seedWgwGroup(AdminRoleResolver::ADMIN_GROUP_URI, 'Administrators');
        $this->addPrincipalToGroup($adminGroup, $alice);
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
        $token = $this->issueBearerToken();

        $run = $this->withBearer($token)
            ->postJson('/api/v1/admin/search/jobs');
        $run->assertOk()
            ->assertJsonPath('ok', true)
            ->assertJsonPath('message', 'Search reindex completed.');

        $state = $this->withBearer($token)
            ->getJson('/api/v1/admin/search/jobs/current');
        $state->assertOk()
            ->assertJsonPath('inProgress', false)
            ->assertJsonPath('lastResult.ok', true);
    }

    public function test_non_admin_cannot_run_search_reindex(): void
    {
        $this->seedWgwUser('bob', displayName: 'Bob');
        $token = $this->issueBearerTokenFor('bob');

        $this->withBearer($token)
            ->postJson('/api/v1/admin/search/jobs')
            ->assertForbidden();
    }
}
