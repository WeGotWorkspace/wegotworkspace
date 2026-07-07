<?php

declare(strict_types=1);

namespace Tests\Feature\Tasks;

use App\Services\Tasks\InboxTaskListProvisioner;
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

    public function test_create_update_and_delete_task_list(): void
    {
        $token = $this->userBearerToken();

        $created = $this->withBearer($token)
            ->postJson('/api/v1/tasks/tasklists', [
                'name' => 'Side project',
                'color' => '#336699',
            ])
            ->assertCreated()
            ->assertJsonPath('name', 'Side project')
            ->assertJsonPath('color', '#336699');

        $listId = (string) $created->json('id');
        $this->assertNotSame('', $listId);

        $this->withBearer($token)
            ->patchJson('/api/v1/tasks/tasklists/'.$listId, [
                'name' => 'Renamed project',
                'color' => '#ff5500',
            ])
            ->assertOk()
            ->assertJsonPath('name', 'Renamed project')
            ->assertJsonPath('color', '#ff5500');

        $this->withBearer($token)
            ->deleteJson('/api/v1/tasks/tasklists/'.$listId)
            ->assertOk()
            ->assertJsonPath('ok', true);

        $this->withBearer($token)
            ->getJson('/api/v1/tasks/tasklists/'.$listId)
            ->assertNotFound();
    }

    public function test_cannot_delete_inbox_task_list(): void
    {
        $this->withBearer($this->userBearerToken())
            ->deleteJson('/api/v1/tasks/tasklists/'.InboxTaskListProvisioner::URI)
            ->assertForbidden()
            ->assertJsonPath('code', 'forbidden');
    }

    public function test_calendars_list_excludes_vtodo_only_inbox(): void
    {
        $response = $this->withBearer($this->userBearerToken())
            ->getJson('/api/v1/calendars/calendars');

        $response->assertOk();
        $ids = collect($response->json('list'))->pluck('id')->all();
        $this->assertNotContains(InboxTaskListProvisioner::URI, $ids);
    }
}
