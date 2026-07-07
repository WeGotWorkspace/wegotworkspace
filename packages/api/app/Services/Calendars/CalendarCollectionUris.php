<?php

declare(strict_types=1);

namespace App\Services\Calendars;

/**
 * Canonical CalDAV collection URIs for strict VEVENT vs VTODO separation.
 *
 * VEVENT calendars and VTODO task lists share display names (Home, Work) but use different URIs.
 */
final class CalendarCollectionUris
{
    public const EVENT_DEFAULT = 'default';

    public const EVENT_HOME = 'home';

    public const EVENT_WORK = 'work';

    public const TASK_INBOX = 'inbox';

    public const TASK_HOME = 'tasks-home';

    public const TASK_WORK = 'tasks-work';

    /** @return list<string> */
    public static function reservedEventUris(): array
    {
        return [self::EVENT_DEFAULT, self::EVENT_HOME, self::EVENT_WORK];
    }

    /** @return list<string> */
    public static function reservedTaskUris(): array
    {
        return [self::TASK_INBOX, self::TASK_HOME, self::TASK_WORK];
    }

    /** @return list<string> */
    public static function reservedTaskUriSlugs(): array
    {
        return array_merge(self::reservedTaskUris(), self::reservedEventUris());
    }
}
