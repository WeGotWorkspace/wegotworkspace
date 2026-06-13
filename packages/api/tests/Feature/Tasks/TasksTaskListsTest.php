<?php

declare(strict_types=1);

namespace Tests\Feature\Tasks;

use Tests\Support\TasksTestFixtures;
use Tests\Support\WgwDatabaseTestCase;

final class TasksTaskListsTest extends WgwDatabaseTestCase
{
    use TasksTestFixtures;

    protected function setUp(): void
    {
        parent::setUp();
        $this->setUpTasksFixtures();
    }

    public function test_list_task_lists_returns_vtodo_capable_calendars(): void
    {
        $response = $this->withBearer($this->userBearerToken())
            ->getJson('/api/v1/tasks/tasklists');

        $response->assertOk()
            ->assertJsonCount(1, 'list')
            ->assertJsonPath('list.0.id', 'default')
            ->assertJsonPath('list.0.name', 'Tasks')
            ->assertJsonPath('list.0.isDefault', true)
            ->assertJsonPath('list.0.myRights.mayReadItems', true);
    }

    public function test_show_task_list(): void
    {
        $response = $this->withBearer($this->userBearerToken())
            ->getJson('/api/v1/tasks/tasklists/default');

        $response->assertOk()
            ->assertJsonPath('id', 'default')
            ->assertJsonPath('role', 'inbox')
            ->assertJsonPath('shareWith', null);
    }

    public function test_show_missing_task_list_returns_not_found(): void
    {
        $this->withBearer($this->userBearerToken())
            ->getJson('/api/v1/tasks/tasklists/missing')
            ->assertNotFound();
    }
}
