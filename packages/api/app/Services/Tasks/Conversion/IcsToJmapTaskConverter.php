<?php

declare(strict_types=1);

namespace App\Services\Tasks\Conversion;

use Sabre\VObject\Component\VCalendar;
use Sabre\VObject\Component\VTodo;
use Sabre\VObject\Reader;

final class IcsToJmapTaskConverter
{
    /**
     * @return list<array<string, mixed>>
     */
    public function tasksFromIcs(string $ics): array
    {
        try {
            $vobject = Reader::read($ics);
        } catch (\Throwable) {
            return [];
        }

        if (! $vobject instanceof VCalendar) {
            return [];
        }

        $tasks = [];
        foreach ($vobject->getComponents('VTODO') as $component) {
            if ($component instanceof VTodo) {
                $tasks[] = $this->convertComponent($component);
            }
        }

        return $tasks;
    }

    /**
     * @return array<string, mixed>
     */
    private function convertComponent(VTodo $todo): array
    {
        $uid = isset($todo->UID) ? trim((string) $todo->UID->getValue()) : '';
        $summary = isset($todo->SUMMARY) ? trim((string) $todo->SUMMARY->getValue()) : null;
        $description = isset($todo->DESCRIPTION) ? trim((string) $todo->DESCRIPTION->getValue()) : null;
        $status = isset($todo->STATUS) ? trim((string) $todo->STATUS->getValue()) : null;
        $class = isset($todo->CLASS) ? trim((string) $todo->CLASS->getValue()) : null;
        $priority = isset($todo->PRIORITY) ? (int) $todo->PRIORITY->getValue() : null;
        $progress = isset($todo->{'PERCENT-COMPLETE'}) ? (int) $todo->{'PERCENT-COMPLETE'}->getValue() : null;

        $categories = [];
        if (isset($todo->CATEGORIES)) {
            foreach ($todo->CATEGORIES as $category) {
                $categories = array_merge($categories, $category->getParts());
            }
        }

        $task = [
            '@type' => 'Task',
            'uid' => $uid !== '' ? $uid : null,
            'title' => $summary !== '' ? $summary : null,
            'description' => $description !== '' ? $description : null,
            'start' => isset($todo->DTSTART)
                ? TaskConversionSupport::formatIcalDateTime((string) $todo->DTSTART->getValue())
                : null,
            'due' => isset($todo->DUE)
                ? TaskConversionSupport::formatIcalDateTime((string) $todo->DUE->getValue())
                : null,
            'completed' => isset($todo->COMPLETED)
                ? TaskConversionSupport::formatIcalDateTime((string) $todo->COMPLETED->getValue())
                : null,
            'workflowStatus' => TaskConversionSupport::workflowFromStatus($status),
            'progress' => $progress,
            'priority' => self::normalizePriority($priority),
            'isDraft' => false,
            'sortOrder' => 0,
            'categories' => array_values(array_filter(array_map('trim', $categories), static fn (string $v): bool => $v !== '')),
            'privacy' => TaskConversionSupport::privacyFromClass($class),
            'created' => isset($todo->CREATED)
                ? TaskConversionSupport::formatIcalDateTime((string) $todo->CREATED->getValue())
                : null,
            'updated' => isset($todo->{'LAST-MODIFIED'})
                ? TaskConversionSupport::formatIcalDateTime((string) $todo->{'LAST-MODIFIED'}->getValue())
                : null,
        ];

        return $task;
    }

    private static function normalizePriority(?int $priority): ?int
    {
        if ($priority === null) {
            return null;
        }
        if ($priority <= 0) {
            return null;
        }

        return min(10, max(0, 10 - $priority + 1));
    }
}
