<?php

declare(strict_types=1);

namespace Tests\Feature\Admin;

use App\Storage\WgwStorage;
use Tests\Support\AdminTestFixtures;
use Tests\Support\WgwDatabaseTestCase;

final class AdminBackupsTest extends WgwDatabaseTestCase
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

    public function test_admin_can_list_and_delete_backup(): void
    {
        $backupName = 'test-backup-0.1.0-to-0.1.1.zip';
        app(WgwStorage::class)->data()->put('updates/backup/'.$backupName, 'fake-backup-bytes');

        $token = $this->adminBearerToken();

        $state = $this->withBearer($token)->getJson('/api/v1/admin/updates/state');
        $state->assertOk();
        $backupNames = array_column($state->json('backups'), 'name');
        $this->assertContains($backupName, $backupNames);

        $this->withBearer($token)
            ->get('/api/v1/admin/backups/'.$backupName)
            ->assertOk();

        $deleted = $this->withBearer($token)
            ->deleteJson('/api/v1/admin/backups/'.$backupName);
        $deleted->assertOk();
        $backupNamesAfter = array_column($deleted->json('backups'), 'name');
        $this->assertNotContains($backupName, $backupNamesAfter);
        $this->assertFalse(app(WgwStorage::class)->data()->exists('updates/backup/'.$backupName));
    }

    public function test_non_admin_cannot_delete_backup(): void
    {
        app(WgwStorage::class)->data()->put('updates/backup/protected.zip', 'bytes');

        $this->withBearer($this->userBearerToken())
            ->deleteJson('/api/v1/admin/backups/protected.zip')
            ->assertForbidden();
    }
}
