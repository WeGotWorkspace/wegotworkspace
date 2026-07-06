<?php

declare(strict_types=1);

namespace Tests\Feature\Tasks;

use Tests\Support\TasksTestFixtures;
use Tests\Support\WgwDatabaseTestCase;

final class TasksTaskListsSyncTest extends WgwDatabaseTestCase
{
    use TasksTestFixtures;

    protected function setUp(): void
    {
        parent::setUp();
        $this->setUpTasksFixtures();
    }

    public function test_task_list_changes_reports_created_list(): void
    {
        $initial = $this->withBearer($this->userBearerToken())
            ->getJson('/api/v1/tasks/tasklists/changes')
            ->assertOk();

        $state = $initial->json('newState');
        $this->assertNotSame('', (string) $state);

        $this->withBearer($this->userBearerToken())
            ->postJson('/api/v1/tasks/tasklists', [
                'name' => 'Sync list',
                'id' => 'sync-list',
            ])
            ->assertCreated();

        $changes = $this->withBearer($this->userBearerToken())
            ->getJson('/api/v1/tasks/tasklists/changes?since='.$state)
            ->assertOk();

        $changes->assertJsonPath('created.0', 'sync-list');
    }
}
