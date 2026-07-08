<?php

declare(strict_types=1);

namespace Tests\Feature\Tasks;

use App\Models\Principal;
use App\Services\Calendars\CalendarCollectionUris;
use App\Services\Tasks\InboxTaskListProvisioner;
use Tests\Support\TasksTestFixtures;
use Tests\Support\WgwDatabaseTestCase;

/**
 * Shared group task lists under principals/groups/{slug} (VTODO collection tasks-{slug}).
 */
final class TasksSharedTaskListsTest extends WgwDatabaseTestCase
{
    use TasksTestFixtures;

    private const TEAM = 'team';

    protected function setUp(): void
    {
        parent::setUp();
        $this->setUpTasksFixtures();
        $team = $this->seedWgwGroup('principals/groups/'.self::TEAM, 'Team');
        $bob = Principal::forUsername('bob');
        $this->assertNotNull($bob);
        $this->addPrincipalToGroup($team, $bob);
    }

    public function test_list_includes_personal_and_group_task_lists(): void
    {
        $response = $this->withBearer($this->userBearerToken())
            ->getJson('/api/v1/tasks/tasklists');

        $response->assertOk();
        $lists = collect($response->json('list'));

        $inbox = $lists->firstWhere('id', InboxTaskListProvisioner::URI);
        $this->assertIsArray($inbox);
        $this->assertSame('personal', $inbox['scope']);
        $this->assertNull($inbox['groupSlug']);

        $groupList = $lists->firstWhere('id', CalendarCollectionUris::groupTaskListApiId(self::TEAM));
        $this->assertIsArray($groupList);
        $this->assertSame('group', $groupList['scope']);
        $this->assertSame(self::TEAM, $groupList['groupSlug']);
        $this->assertSame('Team', $groupList['name']);
        $this->assertSame('group', $groupList['role']);
        $this->assertFalse($groupList['myRights']['mayDelete']);
    }

    public function test_non_member_does_not_see_group_task_list(): void
    {
        $response = $this->withBearer($this->issueBearerTokenFor('carol'))
            ->getJson('/api/v1/tasks/tasklists');

        $response->assertOk();
        $ids = collect($response->json('list'))->pluck('id')->all();
        $this->assertNotContains(CalendarCollectionUris::groupTaskListApiId(self::TEAM), $ids);
    }

    public function test_member_can_create_task_in_group_list(): void
    {
        $listId = CalendarCollectionUris::groupTaskListApiId(self::TEAM);
        $response = $this->withBearer($this->userBearerToken())
            ->postJson('/api/v1/tasks/items', [
                'taskListIds' => [$listId => true],
                'title' => 'Shared task',
            ]);

        $response->assertCreated()
            ->assertJsonPath('taskListId', $listId)
            ->assertJsonPath('title', 'Shared task');
    }

    public function test_show_group_task_list(): void
    {
        $listId = CalendarCollectionUris::groupTaskListApiId(self::TEAM);
        $this->withBearer($this->userBearerToken())
            ->getJson('/api/v1/tasks/tasklists/'.$listId)
            ->assertOk()
            ->assertJsonPath('id', $listId)
            ->assertJsonPath('scope', 'group')
            ->assertJsonPath('groupSlug', self::TEAM);
    }
}
