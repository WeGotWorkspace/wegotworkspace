<?php

declare(strict_types=1);

namespace App\Services\Tasks;

use App\Exceptions\ApiHttpException;
use App\Models\CalendarInstance;

final class TaskListRepository
{
    /**
     * @return array{list: list<array<string, mixed>>}
     */
    public function list(string $username): array
    {
        $instances = CalendarInstance::query()
            ->with('calendar')
            ->where('principaluri', $this->principalUri($username))
            ->whereHas('calendar', function ($query): void {
                $query->where('components', 'like', '%VTODO%');
            })
            ->orderBy('calendarorder')
            ->orderBy('id')
            ->get();

        return [
            'list' => $instances
                ->map(fn (CalendarInstance $instance): array => $this->mapTaskList($instance))
                ->values()
                ->all(),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public function show(string $username, string $taskListId): array
    {
        $instance = $this->findOwnedTaskList($username, $taskListId);
        if ($instance === null) {
            throw new ApiHttpException(404, 'Task list not found.', 'not_found');
        }

        return $this->mapTaskList($instance);
    }

    public function findOwnedTaskList(string $username, string $taskListId): ?CalendarInstance
    {
        $instance = CalendarInstance::query()
            ->with('calendar')
            ->where('principaluri', $this->principalUri($username))
            ->where('uri', $taskListId)
            ->whereHas('calendar', function ($query): void {
                $query->where('components', 'like', '%VTODO%');
            })
            ->first();

        return $instance;
    }

    /**
     * @return array<string, mixed>
     */
    private function mapTaskList(CalendarInstance $instance): array
    {
        $uri = (string) $instance->uri;
        $name = trim((string) ($instance->displayname ?? ''));
        if ($name === '') {
            $name = $uri;
        }

        return [
            'id' => $uri,
            'role' => $uri === 'default' ? 'inbox' : null,
            'name' => $name,
            'description' => is_string($instance->description) && trim($instance->description) !== ''
                ? trim($instance->description)
                : null,
            'color' => is_string($instance->calendarcolor) && trim($instance->calendarcolor) !== ''
                ? trim($instance->calendarcolor)
                : null,
            'sortOrder' => (int) ($instance->calendarorder ?? $instance->id ?? 0),
            'isDefault' => $uri === 'default',
            'isSubscribed' => true,
            'shareWith' => null,
            'myRights' => [
                'mayReadItems' => true,
                'mayWriteAll' => true,
                'mayWriteOwn' => true,
                'mayUpdatePrivate' => true,
                'mayRSVP' => true,
                'mayAdmin' => false,
                'mayDelete' => false,
            ],
        ];
    }

    private function principalUri(string $username): string
    {
        return 'principals/'.$username;
    }
}
