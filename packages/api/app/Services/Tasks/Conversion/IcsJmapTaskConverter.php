<?php

declare(strict_types=1);

namespace App\Services\Tasks\Conversion;

/**
 * Facade for bidirectional iCalendar VTODO ↔ JMAP Task conversion.
 */
final class IcsJmapTaskConverter
{
    public function __construct(
        private readonly IcsToJmapTaskConverter $reader = new IcsToJmapTaskConverter,
        private readonly JmapToIcsTaskConverter $writer = new JmapToIcsTaskConverter,
    ) {}

    /**
     * @return list<array<string, mixed>>
     */
    public function tasksFromIcs(
        string $ics,
        string $objectUri = '',
        string $taskListId = 'default',
    ): array {
        $tasks = $this->reader->tasksFromIcs($ics);
        if ($tasks === [] || $objectUri === '') {
            return $tasks;
        }

        $baseId = self::taskIdFromUri($objectUri);

        if (count($tasks) === 1) {
            $task = $tasks[0];
            $task['id'] = $baseId;
            $task['taskListId'] = $taskListId;

            return [$task];
        }

        $mapped = [];
        foreach ($tasks as $task) {
            $uid = is_string($task['uid'] ?? null) ? (string) $task['uid'] : '';
            $task['id'] = $uid !== '' ? $baseId.'#'.$uid : $baseId;
            $task['taskListId'] = $taskListId;
            $mapped[] = $task;
        }

        return $mapped;
    }

    /**
     * @return array<string, mixed>|null
     */
    public function taskFromIcsComponent(string $ics, string $objectUri, string $taskListId, ?string $vtodoUid = null): ?array
    {
        foreach ($this->tasksFromIcs($ics, $objectUri, $taskListId) as $task) {
            if ($vtodoUid === null) {
                return $task;
            }
            if (($task['uid'] ?? null) === $vtodoUid) {
                return $task;
            }
        }

        return null;
    }

    /**
     * @param  array<string, mixed>  $task
     */
    public function icsFromTask(array $task): string
    {
        return $this->writer->icsFromTask($task);
    }

    /**
     * @param  array<string, mixed>  $task
     */
    public function mergeTaskIntoIcs(string $ics, array $task, ?string $replaceUid = null): string
    {
        return $this->writer->upsertTaskInIcs($ics, $task, $replaceUid);
    }

    public function removeVtodoFromIcs(string $ics, string $vtodoUid): ?string
    {
        return $this->writer->removeTaskFromIcs($ics, $vtodoUid);
    }

    public static function taskIdFromUri(string $uri): string
    {
        return str_ends_with($uri, '.ics')
            ? substr($uri, 0, -4)
            : $uri;
    }

    public static function taskUriFromId(string $taskId): string
    {
        $hashPos = strpos($taskId, '#');
        $base = $hashPos !== false ? substr($taskId, 0, $hashPos) : $taskId;

        return str_ends_with($base, '.ics') ? $base : $base.'.ics';
    }

    /**
     * @return array{objectUri: string, vtodoUid: string|null}
     */
    public static function parseTaskId(string $taskId): array
    {
        $hashPos = strpos($taskId, '#');
        if ($hashPos === false) {
            return [
                'objectUri' => self::taskUriFromId($taskId),
                'vtodoUid' => null,
            ];
        }

        return [
            'objectUri' => self::taskUriFromId(substr($taskId, 0, $hashPos)),
            'vtodoUid' => substr($taskId, $hashPos + 1),
        ];
    }
}
