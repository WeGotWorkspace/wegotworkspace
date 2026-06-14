<?php

declare(strict_types=1);

namespace Tests\Feature\Tasks;

use Tests\Support\TasksTestFixtures;
use Tests\Support\WgwDatabaseTestCase;

final class TasksItemsSyncTest extends WgwDatabaseTestCase
{
    use TasksTestFixtures;

    private const TEST_UID = 'urn:uuid:550e8400-e29b-41d4-a716-446655440088';

    protected function setUp(): void
    {
        parent::setUp();
        $this->setUpTasksFixtures();
    }

    public function test_query_by_uid_returns_matching_task_id(): void
    {
        $create = $this->withBearer($this->userBearerToken())
            ->postJson('/api/v1/tasks/items', array_merge(
                $this->sampleTaskCreatePayload(),
                [
                    'uid' => self::TEST_UID,
                    'title' => 'Query Target',
                ],
            ))
            ->assertCreated();

        $taskId = $create->json('id');

        $this->withBearer($this->userBearerToken())
            ->postJson('/api/v1/tasks/items/query', [
                'filter' => [
                    'inTaskList' => 'default',
                    'uid' => self::TEST_UID,
                ],
            ])
            ->assertOk()
            ->assertJsonPath('ids.0', $taskId)
            ->assertJsonPath('total', 1);
    }
}
