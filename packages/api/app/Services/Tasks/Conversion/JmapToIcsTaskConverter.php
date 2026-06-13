<?php

declare(strict_types=1);

namespace App\Services\Tasks\Conversion;

use Sabre\VObject\Component\VCalendar;
use Sabre\VObject\Component\VTodo;
use Sabre\VObject\Reader;
use Sabre\VObject\Writer;

final class JmapToIcsTaskConverter
{
    /**
     * @param  array<string, mixed>  $task
     */
    public function icsFromTask(array $task, ?string $prodId = null): string
    {
        $calendar = new VCalendar([
            'VERSION' => '2.0',
            'PRODID' => $prodId ?? '-//WeGotWorkspace//Tasks API//EN',
        ]);

        $this->addTodoToCalendar($calendar, $task);

        return Writer::write($calendar);
    }

    /**
     * @param  array<string, mixed>  $task
     */
    public function upsertTaskInIcs(string $ics, array $task, ?string $targetUid = null): string
    {
        try {
            $calendar = Reader::read($ics);
        } catch (\Throwable) {
            $calendar = new VCalendar(['VERSION' => '2.0', 'PRODID' => '-//WeGotWorkspace//Tasks API//EN']);
        }

        if (! $calendar instanceof VCalendar) {
            $calendar = new VCalendar(['VERSION' => '2.0', 'PRODID' => '-//WeGotWorkspace//Tasks API//EN']);
        }

        $uid = is_string($task['uid'] ?? null) ? trim((string) $task['uid']) : '';
        $matchUid = $targetUid ?? $uid;

        if ($matchUid !== '') {
            foreach ($calendar->getComponents('VTODO') as $existing) {
                if ($existing instanceof VTodo && isset($existing->UID) && (string) $existing->UID->getValue() === $matchUid) {
                    $calendar->remove($existing);
                    break;
                }
            }
        }

        $this->addTodoToCalendar($calendar, $task);

        return Writer::write($calendar);
    }

    /**
     * Remove a VTODO by uid from an .ics blob. Returns null when no VTODO remains.
     */
    public function removeTaskFromIcs(string $ics, string $uid): ?string
    {
        try {
            $calendar = Reader::read($ics);
        } catch (\Throwable) {
            return null;
        }

        if (! $calendar instanceof VCalendar) {
            return null;
        }

        foreach ($calendar->getComponents('VTODO') as $existing) {
            if ($existing instanceof VTodo && isset($existing->UID) && (string) $existing->UID->getValue() === $uid) {
                $calendar->remove($existing);
                break;
            }
        }

        if ($calendar->getComponents('VTODO') === []) {
            return null;
        }

        return Writer::write($calendar);
    }

    /**
     * @param  array<string, mixed>  $task
     */
    private function addTodoToCalendar(VCalendar $calendar, array $task): void
    {
        $properties = [
            'UID' => (string) ($task['uid'] ?? ''),
        ];

        if (isset($task['title']) && is_string($task['title']) && trim($task['title']) !== '') {
            $properties['SUMMARY'] = trim($task['title']);
        }
        if (isset($task['description']) && is_string($task['description']) && trim($task['description']) !== '') {
            $properties['DESCRIPTION'] = trim($task['description']);
        }

        $status = TaskConversionSupport::statusFromWorkflow(
            is_string($task['workflowStatus'] ?? null) ? $task['workflowStatus'] : null
        );
        if ($status !== null) {
            $properties['STATUS'] = $status;
        }

        $class = TaskConversionSupport::classFromPrivacy(
            is_string($task['privacy'] ?? null) ? $task['privacy'] : null
        );
        if ($class !== null) {
            $properties['CLASS'] = $class;
        }

        if (isset($task['priority']) && is_int($task['priority'])) {
            $properties['PRIORITY'] = (string) max(1, min(9, 10 - $task['priority'] + 1));
        }
        if (isset($task['progress']) && is_int($task['progress'])) {
            $properties['PERCENT-COMPLETE'] = (string) max(0, min(100, $task['progress']));
        }

        if (isset($task['start']) && is_string($task['start']) && trim($task['start']) !== '') {
            $properties['DTSTART'] = TaskConversionSupport::toIcalDateTime($task['start']);
        }
        if (isset($task['due']) && is_string($task['due']) && trim($task['due']) !== '') {
            $properties['DUE'] = TaskConversionSupport::toIcalDateTime($task['due']);
        }
        if (isset($task['completed']) && is_string($task['completed']) && trim($task['completed']) !== '') {
            $properties['COMPLETED'] = TaskConversionSupport::toIcalDateTime($task['completed']);
        }
        if (isset($task['created']) && is_string($task['created']) && trim($task['created']) !== '') {
            $properties['CREATED'] = TaskConversionSupport::toIcalDateTime($task['created']);
        }
        if (isset($task['updated']) && is_string($task['updated']) && trim($task['updated']) !== '') {
            $properties['LAST-MODIFIED'] = TaskConversionSupport::toIcalDateTime($task['updated']);
        }

        $todo = $calendar->add('VTODO', $properties);

        if (isset($task['categories']) && is_array($task['categories']) && $task['categories'] !== []) {
            $todo->add('CATEGORIES', implode(',', array_map('strval', $task['categories'])));
        }
    }
}
