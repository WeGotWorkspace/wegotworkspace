<?php

declare(strict_types=1);

namespace Tests\Feature\Admin;

use App\Storage\WgwStorage;
use Tests\Support\AdminTestFixtures;
use Tests\Support\WgwDatabaseTestCase;

final class AdminUpdatesTest extends WgwDatabaseTestCase
{
    use AdminTestFixtures;

    protected function setUp(): void
    {
        parent::setUp();
        $this->setUpAdminFixtures();
    }

    protected function tearDown(): void
    {
        $this->tearDownAdminFixtures();
        parent::tearDown();
    }

    public function test_admin_can_read_update_state(): void
    {
        $this->withBearer($this->adminBearerToken())
            ->getJson('/api/v1/admin/updates/state')
            ->assertOk()
            ->assertJsonStructure([
                'installedVersion',
                'schemaVersion',
                'backups',
                'compatible',
                'updateAvailable',
            ]);
    }

    public function test_admin_can_round_trip_update_log(): void
    {
        $token = $this->adminBearerToken();

        app(WgwStorage::class)->data()->put('updates/process.log', "[2026-01-01T00:00:00+00:00] test line\n");

        $this->withBearer($token)
            ->getJson('/api/v1/admin/updates/log')
            ->assertOk()
            ->assertJsonPath('lines.0', '[2026-01-01T00:00:00+00:00] test line');

        $this->withBearer($token)
            ->deleteJson('/api/v1/admin/updates/log')
            ->assertOk()
            ->assertJsonPath('ok', true)
            ->assertJsonPath('lines', []);
    }

    public function test_invalid_update_job_type_returns_bad_request(): void
    {
        $this->withBearer($this->adminBearerToken())
            ->postJson('/api/v1/admin/update-jobs', ['type' => 'unknown'])
            ->assertBadRequest()
            ->assertJsonPath('error', 'Invalid update job type.');
    }

    public function test_update_check_job_can_be_triggered(): void
    {
        $this->withBearer($this->adminBearerToken())
            ->postJson('/api/v1/admin/update-jobs', ['type' => 'check'])
            ->assertAccepted()
            ->assertJsonStructure(['installedVersion', 'schemaVersion', 'backups']);
    }

    public function test_non_admin_cannot_trigger_update_job(): void
    {
        $this->withBearer($this->userBearerToken())
            ->postJson('/api/v1/admin/update-jobs', ['type' => 'check'])
            ->assertForbidden();
    }
}
