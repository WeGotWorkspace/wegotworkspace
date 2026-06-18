<?php

declare(strict_types=1);

namespace App\Services\Calendars;

use App\Exceptions\ApiHttpException;
use App\Models\CalendarInstance;

final class CalendarRepository
{
    /**
     * @return array{list: list<array<string, mixed>>}
     */
    public function list(string $username): array
    {
        $instances = CalendarInstance::query()
            ->where('principaluri', $this->principalUri($username))
            ->orderBy('calendarorder')
            ->orderBy('id')
            ->get();

        return [
            'list' => $instances
                ->map(fn (CalendarInstance $instance): array => $this->mapCalendar($instance))
                ->values()
                ->all(),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public function show(string $username, string $calendarId): array
    {
        $instance = $this->findOwnedCalendar($username, $calendarId);
        if ($instance === null) {
            throw new ApiHttpException(404, 'Calendar not found.', 'not_found');
        }

        return $this->mapCalendar($instance);
    }

    private function findOwnedCalendar(string $username, string $calendarId): ?CalendarInstance
    {
        return CalendarInstance::query()
            ->where('principaluri', $this->principalUri($username))
            ->where('uri', $calendarId)
            ->first();
    }

    /**
     * @return array<string, mixed>
     */
    private function mapCalendar(CalendarInstance $instance): array
    {
        $uri = (string) $instance->uri;
        $name = trim((string) ($instance->displayname ?? ''));
        if ($name === '') {
            $name = $uri;
        }

        $rights = match ((int) ($instance->access ?? 1)) {
            2 => ['mayRead' => true, 'mayWrite' => false, 'mayShare' => false, 'mayDelete' => false],
            3 => ['mayRead' => true, 'mayWrite' => true, 'mayShare' => false, 'mayDelete' => false],
            default => ['mayRead' => true, 'mayWrite' => true, 'mayShare' => false, 'mayDelete' => false],
        };

        return [
            'id' => $uri,
            'name' => $name,
            'description' => is_string($instance->description) && trim($instance->description) !== ''
                ? trim($instance->description)
                : null,
            'timeZone' => is_string($instance->timezone) && trim($instance->timezone) !== ''
                ? trim($instance->timezone)
                : null,
            'color' => is_string($instance->calendarcolor) && trim($instance->calendarcolor) !== ''
                ? trim($instance->calendarcolor)
                : null,
            'sortOrder' => (int) ($instance->calendarorder ?? 0),
            'isDefault' => $uri === 'default',
            'isSubscribed' => true,
            'shareWith' => null,
            'myRights' => $rights,
        ];
    }

    private function principalUri(string $username): string
    {
        return 'principals/'.$username;
    }
}
