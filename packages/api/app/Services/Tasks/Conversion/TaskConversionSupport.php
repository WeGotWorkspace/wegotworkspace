<?php

declare(strict_types=1);

namespace App\Services\Tasks\Conversion;

use App\Services\Calendars\Conversion\CalendarConversionSupport;
use Sabre\VObject\Component\VTodo;

/**
 * VTODO → JMAP Task field mapping helpers.
 */
final class TaskConversionSupport
{
    /** @var array<string, string> */
    private const STATUS_TO_WORKFLOW = [
        'NEEDS-ACTION' => 'needs-action',
        'IN-PROCESS' => 'in-process',
        'COMPLETED' => 'completed',
        'CANCELLED' => 'cancelled',
    ];

    /** @var array<string, string> */
    private const WORKFLOW_TO_STATUS = [
        'needs-action' => 'NEEDS-ACTION',
        'in-process' => 'IN-PROCESS',
        'completed' => 'COMPLETED',
        'cancelled' => 'CANCELLED',
        'pending' => 'NEEDS-ACTION',
        'failed' => 'CANCELLED',
    ];

    /** @var array<string, string> */
    private const CLASS_TO_PRIVACY = [
        'PUBLIC' => 'public',
        'PRIVATE' => 'private',
        'CONFIDENTIAL' => 'secret',
    ];

    /** @var array<string, string> */
    private const PRIVACY_TO_CLASS = [
        'public' => 'PUBLIC',
        'private' => 'PRIVATE',
        'secret' => 'CONFIDENTIAL',
    ];

    /** @var list<string> */
    private const NULLABLE_FIELDS = [
        'description',
        'start',
        'due',
        'completed',
        'workflowStatus',
        'progress',
        'priority',
        'privacy',
        'recurrenceRules',
        'excludedRecurrenceDates',
        'recurrenceOverrides',
        'alerts',
    ];

    public static function workflowFromStatus(?string $status): ?string
    {
        if ($status === null || trim($status) === '') {
            return null;
        }

        return self::STATUS_TO_WORKFLOW[strtoupper(trim($status))] ?? 'needs-action';
    }

    public static function statusFromWorkflow(?string $workflowStatus): ?string
    {
        if ($workflowStatus === null || trim($workflowStatus) === '') {
            return null;
        }

        return self::WORKFLOW_TO_STATUS[strtolower(trim($workflowStatus))] ?? 'NEEDS-ACTION';
    }

    public static function privacyFromClass(?string $class): ?string
    {
        if ($class === null || trim($class) === '') {
            return null;
        }

        return self::CLASS_TO_PRIVACY[strtoupper(trim($class))] ?? 'public';
    }

    public static function classFromPrivacy(?string $privacy): ?string
    {
        if ($privacy === null || trim($privacy) === '') {
            return null;
        }

        return self::PRIVACY_TO_CLASS[strtolower(trim($privacy))] ?? 'PUBLIC';
    }

    /**
     * @param  array<string, mixed>  $existing
     * @param  array<string, mixed>  $patch
     * @return array<string, mixed>
     */
    public static function mergeTaskPatch(array $existing, array $patch): array
    {
        $merged = $existing;
        foreach ($patch as $key => $value) {
            if ($value === null && in_array($key, self::NULLABLE_FIELDS, true)) {
                $merged[$key] = null;

                continue;
            }
            if (in_array($key, ['recurrenceOverrides', 'alerts'], true)
                && is_array($value)
                && isset($merged[$key])
                && is_array($merged[$key])) {
                $merged[$key] = array_replace($merged[$key], $value);

                continue;
            }
            $merged[$key] = $value;
        }

        return $merged;
    }

    /**
     * @return array<string, mixed>
     */
    public static function normalizeTaskMapKeys(array $task): array
    {
        if (! isset($task['@type']) || ! is_string($task['@type'])) {
            $task['@type'] = 'Task';
        }

        if (! isset($task['alerts']) || ! is_array($task['alerts'])) {
            return $task;
        }

        $normalized = [];
        foreach ($task['alerts'] as $id => $entry) {
            if (! is_array($entry)) {
                continue;
            }
            if (! isset($entry['@type'])) {
                $entry['@type'] = 'Alert';
            }
            $normalized[(string) $id] = $entry;
        }
        if ($normalized !== []) {
            $task['alerts'] = $normalized;
        } else {
            unset($task['alerts']);
        }

        return $task;
    }

    /**
     * @return array<string, mixed>
     */
    public static function recurrenceOverrideFromVtodo(VTodo $todo): array
    {
        $override = [];

        if (isset($todo->SUMMARY)) {
            $title = trim((string) $todo->SUMMARY->getValue());
            if ($title !== '') {
                $override['title'] = $title;
            }
        }
        if (isset($todo->DESCRIPTION)) {
            $description = trim((string) $todo->DESCRIPTION->getValue());
            if ($description !== '') {
                $override['description'] = $description;
            }
        }
        if (isset($todo->DTSTART)) {
            $override['start'] = self::formatIcalDateTime((string) $todo->DTSTART->getValue());
        }
        if (isset($todo->DUE)) {
            $override['due'] = self::formatIcalDateTime((string) $todo->DUE->getValue());
        }
        if (isset($todo->COMPLETED)) {
            $override['completed'] = self::formatIcalDateTime((string) $todo->COMPLETED->getValue());
        }

        $status = isset($todo->STATUS) ? strtoupper(trim((string) $todo->STATUS->getValue())) : null;
        if ($status === 'CANCELLED') {
            $override['excluded'] = true;
        } elseif ($status !== null && $status !== '') {
            $override['workflowStatus'] = self::workflowFromStatus($status);
        }

        if (isset($todo->{'PERCENT-COMPLETE'})) {
            $override['progress'] = (int) $todo->{'PERCENT-COMPLETE'}->getValue();
        }

        return $override;
    }

    /**
     * @param  array<string, mixed>  $task
     * @return list<string>
     */
    public static function excludedDatesFromRecurrenceOverrides(array $task): array
    {
        $overrides = $task['recurrenceOverrides'] ?? null;
        if (! is_array($overrides)) {
            return [];
        }

        $excluded = is_array($task['excludedRecurrenceDates'] ?? null)
            ? $task['excludedRecurrenceDates']
            : [];

        foreach ($overrides as $recurrenceId => $patch) {
            if (! is_string($recurrenceId) || ! is_array($patch)) {
                continue;
            }
            if (($patch['excluded'] ?? false) === true) {
                $excluded[] = $recurrenceId;
            }
        }

        return array_values(array_unique($excluded));
    }

    /**
     * @param  array<string, mixed>  $task
     * @return array<string, mixed>
     */
    public static function writableRecurrenceOverrides(array $task): array
    {
        $overrides = $task['recurrenceOverrides'] ?? null;
        if (! is_array($overrides)) {
            return [];
        }

        $writable = [];
        foreach ($overrides as $recurrenceId => $patch) {
            if (! is_string($recurrenceId) || ! is_array($patch)) {
                continue;
            }
            if (($patch['excluded'] ?? false) === true) {
                continue;
            }
            $writable[$recurrenceId] = $patch;
        }

        return $writable;
    }

    public static function formatIcalDateTime(?string $value): ?string
    {
        if ($value === null || trim($value) === '') {
            return null;
        }

        $trimmed = trim($value);
        if (preg_match('/^\d{8}T\d{6}Z$/', $trimmed) === 1) {
            $dt = \DateTimeImmutable::createFromFormat('Ymd\THis\Z', $trimmed, new \DateTimeZone('UTC'));

            return $dt !== false ? $dt->format('Y-m-d\TH:i:s\Z') : CalendarConversionSupport::normalizeUtcDateTime($trimmed);
        }
        if (preg_match('/^\d{8}T\d{6}$/', $trimmed) === 1) {
            $dt = \DateTimeImmutable::createFromFormat('Ymd\THis', $trimmed);

            return $dt !== false ? $dt->format('Y-m-d\TH:i:s') : CalendarConversionSupport::normalizeUtcDateTime($trimmed);
        }
        if (preg_match('/^\d{8}$/', $trimmed) === 1) {
            $dt = \DateTimeImmutable::createFromFormat('Ymd', $trimmed);

            return $dt !== false ? $dt->format('Y-m-d') : $trimmed;
        }

        return CalendarConversionSupport::normalizeUtcDateTime($trimmed);
    }

    public static function toIcalDateTime(?string $value): ?string
    {
        if ($value === null || trim($value) === '') {
            return null;
        }

        $trimmed = trim($value);
        if (preg_match('/^\d{4}-\d{2}-\d{2}$/', $trimmed) === 1) {
            return str_replace('-', '', $trimmed);
        }
        if (str_ends_with($trimmed, 'Z')) {
            $dt = new \DateTimeImmutable($trimmed);

            return $dt->setTimezone(new \DateTimeZone('UTC'))->format('Ymd\THis\Z');
        }

        $dt = new \DateTimeImmutable($trimmed);

        return $dt->format('Ymd\THis');
    }
}
