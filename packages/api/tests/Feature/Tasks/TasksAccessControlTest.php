<?php

declare(strict_types=1);

namespace Tests\Feature\Tasks;

use App\Support\WgwSettings;
use Tests\Support\TasksTestFixtures;
use Tests\Support\WgwDatabaseTestCase;

final class TasksAccessControlTest extends WgwDatabaseTestCase
{
    use TasksTestFixtures;

    protected function setUp(): void
    {
        parent::setUp();
        $this->setUpTasksFixtures();
    }

    public function test_guest_cannot_access_tasks_endpoints(): void
    {
        $this->getJson('/api/v1/tasks/tasklists')->assertUnauthorized();
        $this->getJson('/api/v1/tasks/tasklists/default')->assertUnauthorized();
        $this->getJson('/api/v1/tasks/items?taskListId=default')->assertUnauthorized();
        $this->postJson('/api/v1/tasks/items', [])->assertUnauthorized();
    }

    public function test_authenticated_user_can_access_tasks_when_enabled(): void
    {
        $token = $this->userBearerToken();

        $this->withBearer($token)->getJson('/api/v1/tasks/tasklists')->assertOk();
        $this->withBearer($token)->getJson('/api/v1/tasks/items?taskListId=default')->assertOk();
    }

    public function test_tasks_disabled_returns_forbidden(): void
    {
        $this->setAppSetting(WgwSettings::TASKS_ENABLED, false);
        $token = $this->userBearerToken();

        $this->withBearer($token)->getJson('/api/v1/tasks/tasklists')->assertForbidden();
        $this->withBearer($token)->getJson('/api/v1/tasks/items?taskListId=default')->assertForbidden();
        $this->withBearer($token)->postJson('/api/v1/tasks/items', [])->assertForbidden();
    }
}
