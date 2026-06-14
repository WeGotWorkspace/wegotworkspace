<?php

declare(strict_types=1);

namespace Tests\Feature\Tasks;

use Tests\Support\TasksTestFixtures;
use Tests\Support\WgwDatabaseTestCase;

final class TasksTaskListsCrudTest extends WgwDatabaseTestCase
{
    use TasksTestFixtures;

    protected function setUp(): void
    {
        parent::setUp();
        $this->setUpTasksFixtures();
    }

    public function test_create_task_list_returns_new_list(): void
    {
        $response = $this->withBearer($this->userBearerToken())
            ->postJson('/api/v1/tasks/tasklists', [
                'name' => 'Work tasks',
                'id' => 'work',
                'description' => 'Work-only todos',
            ]);

        $response->assertCreated()
            ->assertJsonPath('id', 'work')
            ->assertJsonPath('name', 'Work tasks')
            ->assertJsonPath('description', 'Work-only todos')
            ->assertJsonPath('myRights.mayDelete', true);
    }

    public function test_patch_task_list_updates_name(): void
    {
        $this->withBearer($this->userBearerToken())
            ->postJson('/api/v1/tasks/tasklists', [
                'name' => 'Chores',
                'id' => 'chores',
            ])
            ->assertCreated();

        $this->withBearer($this->userBearerToken())
            ->patchJson('/api/v1/tasks/tasklists/chores', [
                'name' => 'Home chores',
            ])
            ->assertOk()
            ->assertJsonPath('name', 'Home chores');
    }

    public function test_delete_empty_task_list_succeeds(): void
    {
        $this->withBearer($this->userBearerToken())
            ->postJson('/api/v1/tasks/tasklists', [
                'name' => 'Temporary',
                'id' => 'temp-list',
            ])
            ->assertCreated();

        $this->withBearer($this->userBearerToken())
            ->deleteJson('/api/v1/tasks/tasklists/temp-list')
            ->assertOk()
            ->assertJsonPath('ok', true);

        $this->withBearer($this->userBearerToken())
            ->getJson('/api/v1/tasks/tasklists/temp-list')
            ->assertNotFound();
    }

    public function test_delete_default_task_list_is_forbidden(): void
    {
        $this->withBearer($this->userBearerToken())
            ->deleteJson('/api/v1/tasks/tasklists/default')
            ->assertForbidden();
    }

    public function test_delete_task_list_with_tasks_requires_on_destroy_flag(): void
    {
        $this->seedTaskViaPdo('bob', 'milk.ics', $this->sampleTodoIcs('Buy milk'));

        $this->withBearer($this->userBearerToken())
            ->postJson('/api/v1/tasks/tasklists', [
                'name' => 'Has tasks',
                'id' => 'has-tasks',
            ])
            ->assertCreated();

        $taskId = $this->withBearer($this->userBearerToken())
            ->postJson('/api/v1/tasks/items', array_merge(
                $this->sampleTaskCreatePayload('has-tasks'),
                ['title' => 'In extra list'],
            ))
            ->assertCreated()
            ->json('id');

        $this->withBearer($this->userBearerToken())
            ->deleteJson('/api/v1/tasks/tasklists/has-tasks')
            ->assertStatus(409);

        $this->withBearer($this->userBearerToken())
            ->deleteJson('/api/v1/tasks/tasklists/has-tasks', [
                'onDestroyRemoveContents' => true,
            ])
            ->assertOk();

        $this->withBearer($this->userBearerToken())
            ->getJson('/api/v1/tasks/items/'.$taskId)
            ->assertNotFound();
    }

    public function test_share_with_is_rejected_on_patch(): void
    {
        $this->withBearer($this->userBearerToken())
            ->patchJson('/api/v1/tasks/tasklists/default', [
                'shareWith' => ['alice' => ['mayReadItems' => true]],
            ])
            ->assertStatus(400)
            ->assertJsonPath('code', 'bad_request');
    }
}
