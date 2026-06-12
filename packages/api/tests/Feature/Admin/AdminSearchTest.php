<?php

declare(strict_types=1);

namespace Tests\Feature\Admin;

use App\Storage\WgwStorage;
use Tests\Support\AdminTestFixtures;
use Tests\Support\WgwDatabaseTestCase;

final class AdminSearchTest extends WgwDatabaseTestCase
{
    use AdminTestFixtures;

    protected function setUp(): void
    {
        parent::setUp();
        $this->setUpAdminFixtures();
        app(WgwStorage::class)->files()->put('users/alice/admin-search.txt', 'Search reindex coverage');
    }

    protected function tearDown(): void
    {
        $this->tearDownAdminFixtures();
        parent::tearDown();
    }

    public function test_admin_can_run_and_read_search_reindex_state(): void
    {
        $token = $this->adminBearerToken();

        $this->withBearer($token)
            ->postJson('/api/v1/admin/search/jobs')
            ->assertOk()
            ->assertJsonPath('ok', true)
            ->assertJsonPath('message', 'Search reindex completed.');

        $this->withBearer($token)
            ->getJson('/api/v1/admin/search/jobs/current')
            ->assertOk()
            ->assertJsonPath('inProgress', false)
            ->assertJsonPath('lastResult.ok', true);
    }

    public function test_cancel_search_reindex_when_idle_returns_bad_request(): void
    {
        $this->withBearer($this->adminBearerToken())
            ->deleteJson('/api/v1/admin/search/jobs/current')
            ->assertBadRequest()
            ->assertJsonPath('error', 'No search reindex is currently running.');
    }

    public function test_non_admin_cannot_run_search_reindex(): void
    {
        $this->withBearer($this->userBearerToken())
            ->postJson('/api/v1/admin/search/jobs')
            ->assertForbidden();

        $this->withBearer($this->carolBearerToken())
            ->deleteJson('/api/v1/admin/search/jobs/current')
            ->assertForbidden();
    }
}
