<?php

declare(strict_types=1);

namespace App\Services\Tasks\Conversion;

use App\Services\Calendars\Conversion\CalendarConversionSupport;
use App\Services\VObject\VObjectPayloadGuard;
use Sabre\VObject\Component\VCalendar;
use Sabre\VObject\Component\VTodo;
use Sabre\VObject\Writer;

final class JmapToIcsTaskConverter
{
    public function __construct(
        private readonly VObjectPayloadGuard $guard = new VObjectPayloadGuard,
    ) {}

    /**
     * @param  array<string, mixed>  $task
     */
    public function icsFromTask(array $task, ?string $prodId = null): string
    {
        $calendar = new VCalendar([
            'VERSION' => '2.0',
            'PRODID' => $prodId ?? '-//WeGotWorkspace//Tasks API//EN',
        ]);

        $this->writeTaskSeries($calendar, $task);

        return $this->writeCalendar($calendar);
    }

    /**
     * @param  array<string, mixed>  $task
     */
    public function upsertTaskInIcs(string $ics, array $task, ?string $targetUid = null): string
    {
        try {
            $calendar = $this->guard->readICalendar($ics, 'tasks');
        } catch (\Throwable) {
            $calendar = new VCalendar(['VERSION' => '2.0', 'PRODID' => '-//WeGotWorkspace//Tasks API//EN']);
        }

        $uid = is_string($task['uid'] ?? null) ? trim((string) $task['uid']) : '';
        $matchUid = $targetUid ?? $uid;

        if ($matchUid !== '') {
            $this->removeVtodoComponents($calendar, static fn (VTodo $existing): bool => isset($existing->UID)
                && (string) $existing->UID->getValue() === $matchUid);
        }

        $this->writeTaskSeries($calendar, $task);

        return $this->writeCalendar($calendar);
    }

    /**
     * Remove a VTODO by uid from an .ics blob. Returns null when no VTODO remains.
     */
    public function removeTaskFromIcs(string $ics, string $uid): ?string
    {
        try {
            $calendar = $this->guard->readICalendar($ics, 'tasks');
        } catch (\Throwable) {
            return null;
        }

        $this->removeVtodoComponents($calendar, static fn (VTodo $existing): bool => isset($existing->UID)
            && (string) $existing->UID->getValue() === $uid);

        if ($calendar->getComponents('VTODO') === []) {
            return null;
        }

        return $this->writeCalendar($calendar);
    }

    private function writeCalendar(VCalendar $calendar): string
    {
        $ics = Writer::write($calendar);
        $this->guard->assertIcsSize($ics, 'tasks');

        return $ics;
    }

    /**
     * @param  array<string, mixed>  $task
     */
    private function writeTaskSeries(VCalendar $calendar, array $task): void
    {
        $task = TaskConversionSupport::normalizeTaskMapKeys($task);
        $this->addTodoToCalendar($calendar, $task, includeRecurrence: true);

        foreach (TaskConversionSupport::writableRecurrenceOverrides($task) as $recurrenceId => $patch) {
            $overrideTask = TaskConversionSupport::mergeTaskPatch($task, $patch);
            unset(
                $overrideTask['recurrenceRules'],
                $overrideTask['recurrenceOverrides'],
                $overrideTask['excludedRecurrenceDates'],
            );
            $this->addTodoToCalendar($calendar, $overrideTask, includeRecurrence: false, recurrenceId: $recurrenceId);
        }
    }

    /**
     * @param  array<string, mixed>  $task
     */
    private function addTodoToCalendar(
        VCalendar $calendar,
        array $task,
        bool $includeRecurrence,
        ?string $recurrenceId = null,
    ): VTodo {
        $properties = [
            'UID' => (string) ($task['uid'] ?? ''),
        ];

        if ($recurrenceId !== null) {
            $properties['RECURRENCE-ID'] = TaskConversionSupport::toIcalDateTime($recurrenceId);
        }

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

        if (isset($task['created']) && is_string($task['created']) && trim($task['created']) !== '') {
            $properties['CREATED'] = CalendarConversionSupport::utcDateTimeToIcs($task['created']);
        }
        if (isset($task['updated']) && is_string($task['updated']) && trim($task['updated']) !== '') {
            $properties['LAST-MODIFIED'] = CalendarConversionSupport::utcDateTimeToIcs($task['updated']);
        }

        $todo = $calendar->add('VTODO', $properties);

        TaskConversionSupport::writeDateTimesToVtodo($todo, $task);

        if (isset($task['categories']) && is_array($task['categories']) && $task['categories'] !== []) {
            $todo->add('CATEGORIES', implode(',', array_map('strval', $task['categories'])));
        }

        if ($includeRecurrence) {
            $this->writeRecurrenceProperties($todo, $task);
        }

        if (isset($task['alerts']) && is_array($task['alerts']) && $task['alerts'] !== []) {
            CalendarConversionSupport::writeValarmComponents($todo, $task['alerts']);
        }

        TaskConversionSupport::writeParticipantsToVtodo($todo, $task);
        TaskConversionSupport::writeIcsPropsToVtodo($todo, $task);

        return $todo;
    }

    /**
     * @param  array<string, mixed>  $task
     */
    private function writeRecurrenceProperties(VTodo $todo, array $task): void
    {
        if (isset($task['recurrenceRules']) && is_array($task['recurrenceRules'])) {
            foreach ($task['recurrenceRules'] as $rule) {
                if (is_array($rule)) {
                    $todo->add('RRULE', CalendarConversionSupport::recurrenceRuleToIcs($rule));
                }
            }
        }

        $excluded = TaskConversionSupport::excludedDatesFromRecurrenceOverrides($task);
        if ($excluded !== []) {
            $values = array_values(array_filter(array_map(
                static fn (mixed $value): string => is_string($value)
                    ? (TaskConversionSupport::toIcalDateTime($value) ?? '')
                    : '',
                $excluded,
            ), static fn (string $value): bool => $value !== ''));
            if ($values !== []) {
                $todo->add('EXDATE', implode(',', $values));
            }
        } elseif (isset($task['excludedRecurrenceDates']) && is_array($task['excludedRecurrenceDates']) && $task['excludedRecurrenceDates'] !== []) {
            $values = array_values(array_filter(array_map(
                static fn (mixed $value): string => is_string($value)
                    ? (TaskConversionSupport::toIcalDateTime($value) ?? '')
                    : '',
                $task['excludedRecurrenceDates'],
            ), static fn (string $value): bool => $value !== ''));
            if ($values !== []) {
                $todo->add('EXDATE', implode(',', $values));
            }
        }
    }

    /**
     * @param  callable(VTodo): bool  $matcher
     */
    private function removeVtodoComponents(VCalendar $calendar, callable $matcher): void
    {
        foreach ($calendar->getComponents('VTODO') as $existing) {
            if ($existing instanceof VTodo && $matcher($existing)) {
                $calendar->remove($existing);
            }
        }
    }
}
