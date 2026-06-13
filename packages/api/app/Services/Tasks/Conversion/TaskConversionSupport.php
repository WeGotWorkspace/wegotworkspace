<?php

declare(strict_types=1);

namespace App\Services\Tasks\Conversion;

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
            if ($value === null && in_array($key, ['description', 'start', 'due', 'completed', 'workflowStatus', 'progress', 'priority', 'privacy'], true)) {
                $merged[$key] = null;

                continue;
            }
            $merged[$key] = $value;
        }

        return $merged;
    }

    public static function formatIcalDateTime(?string $value): ?string
    {
        if ($value === null || trim($value) === '') {
            return null;
        }

        $trimmed = trim($value);
        if (preg_match('/^\d{8}T\d{6}Z$/', $trimmed) === 1) {
            $dt = \DateTimeImmutable::createFromFormat('Ymd\THis\Z', $trimmed, new \DateTimeZone('UTC'));

            return $dt !== false ? $dt->format('Y-m-d\TH:i:s\Z') : $trimmed;
        }
        if (preg_match('/^\d{8}T\d{6}$/', $trimmed) === 1) {
            $dt = \DateTimeImmutable::createFromFormat('Ymd\THis', $trimmed);

            return $dt !== false ? $dt->format('Y-m-d\TH:i:s') : $trimmed;
        }
        if (preg_match('/^\d{8}$/', $trimmed) === 1) {
            $dt = \DateTimeImmutable::createFromFormat('Ymd', $trimmed);

            return $dt !== false ? $dt->format('Y-m-d') : $trimmed;
        }

        return $trimmed;
    }

    public static function toIcalDateTime(?string $value): ?string
    {
        if ($value === null || trim($value) === '') {
            return null;
        }

        $trimmed = trim($value);
        if (str_ends_with($trimmed, 'Z')) {
            $dt = new \DateTimeImmutable($trimmed);

            return $dt->setTimezone(new \DateTimeZone('UTC'))->format('Ymd\THis\Z');
        }

        $dt = new \DateTimeImmutable($trimmed);

        return $dt->format('Ymd\THis');
    }
}
