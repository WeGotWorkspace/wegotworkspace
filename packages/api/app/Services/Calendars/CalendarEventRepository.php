<?php

declare(strict_types=1);

namespace App\Services\Calendars;

use App\Exceptions\ApiHttpException;
use App\Models\CalendarInstance;
use App\Models\CalendarObject;
use App\Services\Calendars\Conversion\CalendarConversionSupport;
use App\Services\Search\SearchIndexerService;
use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\DB;
use Sabre\CalDAV\Backend\PDO as CalPDO;

final class CalendarEventRepository
{
    public function __construct(
        private readonly CalendarEventMapper $mapper,
        private readonly SearchIndexerService $searchIndexer,
        private readonly CalendarEventExpansionService $expansion,
    ) {}

    /**
     * @return array{list: list<array<string, mixed>>}
     */
    public function list(
        string $username,
        string $calendarId,
        ?string $after = null,
        ?string $before = null,
        bool $expandRecurrences = false,
    ): array {
        $instance = $this->findOwnedCalendar($username, $calendarId);
        if ($instance === null) {
            throw new ApiHttpException(404, 'Calendar not found.', 'not_found');
        }

        $objects = CalendarObject::query()
            ->where('calendarid', (int) $instance->calendarid)
            ->where('componenttype', 'VEVENT')
            ->orderBy('uri')
            ->get();

        $events = [];
        foreach ($objects as $object) {
            $raw = is_string($object->calendardata) ? $object->calendardata : (string) $object->calendardata;
            foreach ($this->mapper->toCalendarEvents($object, $calendarId) as $event) {
                if ($expandRecurrences && $after !== null && $before !== null && $this->expansion->isRecurring($event)) {
                    foreach ($this->expansion->expandInWindow($event, $raw, $calendarId, $after, $before) as $instance) {
                        $events[] = $instance;
                    }
                } else {
                    $events[] = $event;
                }
            }
        }

        return ['list' => $events];
    }

    /**
     * @return array<string, mixed>
     */
    public function show(string $username, string $eventId): array
    {
        $located = $this->findOwnedEvent($username, $eventId);
        if ($located === null) {
            throw new ApiHttpException(404, 'Calendar event not found.', 'not_found');
        }

        return $this->mapper->toCalendarEvent(
            $located['object'],
            $located['calendarUri'],
            $located['veventUid'],
        );
    }

    /**
     * @param  array<string, mixed>  $payload
     * @return array<string, mixed>
     */
    public function create(string $username, array $payload): array
    {
        $instance = $this->resolveCalendarFromPayload($username, $payload);
        $eventPayload = $this->normalizeEventPayload($payload);
        $eventUri = $this->allocateEventUri((int) $instance->calendarid, $eventPayload);
        $ics = $this->mapper->toIcs($eventPayload);

        $this->calBackend()->createCalendarObject($this->calBackendCalendarId($instance), $eventUri, $ics);
        $this->syncSearchIndex(fn () => $this->searchIndexer->indexCalendarObjectFromPath(
            $this->calDavPath($username, (string) $instance->uri, $eventUri)
        ));

        $object = $this->findObjectInCalendar((int) $instance->calendarid, $eventUri, fresh: true);
        if ($object === null) {
            throw new ApiHttpException(500, 'Could not load created calendar event.', 'server_error');
        }

        return $this->mapper->toCalendarEvent($object, (string) $instance->uri);
    }

    /**
     * @param  array<string, mixed>  $payload
     * @return array<string, mixed>
     */
    public function update(string $username, string $eventId, array $payload): array
    {
        return $this->persistEventMutation($username, $eventId, $payload, deepMerge: false);
    }

    /**
     * @param  array<string, mixed>  $patch
     * @return array<string, mixed>
     */
    public function patch(string $username, string $eventId, array $patch): array
    {
        return $this->persistEventMutation($username, $eventId, $patch, deepMerge: true);
    }

    /**
     * @return array{ok: true}
     */
    public function delete(string $username, string $eventId): array
    {
        $located = $this->findOwnedEvent($username, $eventId);
        if ($located === null) {
            throw new ApiHttpException(404, 'Calendar event not found.', 'not_found');
        }

        $instance = $located['instance'];
        $object = $located['object'];
        $eventUri = (string) $object->uri;
        $calendarId = (int) $object->calendarid;
        $veventUid = $located['veventUid'];

        if ($veventUid !== null) {
            $raw = is_string($object->calendardata) ? $object->calendardata : (string) $object->calendardata;
            $remaining = $this->mapper->removeVEventFromIcs($raw, $veventUid);
            if ($remaining === null) {
                $this->calBackend()->deleteCalendarObject($this->calBackendCalendarId($instance), $eventUri);
                $this->syncSearchIndex(fn () => $this->searchIndexer->deleteDavPath(
                    $this->calDavPath($username, (string) $instance->uri, $eventUri)
                ));
            } else {
                $this->calBackend()->updateCalendarObject($this->calBackendCalendarId($instance), $eventUri, $remaining);
                $this->syncSearchIndex(fn () => $this->searchIndexer->indexCalendarObjectFromPath(
                    $this->calDavPath($username, (string) $instance->uri, $eventUri)
                ));
            }
        } else {
            $this->calBackend()->deleteCalendarObject($this->calBackendCalendarId($instance), $eventUri);
            $this->syncSearchIndex(fn () => $this->searchIndexer->deleteDavPath(
                $this->calDavPath($username, (string) $instance->uri, $eventUri)
            ));
        }

        return ['ok' => true];
    }

    /**
     * @param  array<string, mixed>  $payload
     * @return array<string, mixed>
     */
    private function persistEventMutation(
        string $username,
        string $eventId,
        array $payload,
        bool $deepMerge,
    ): array {
        $located = $this->findOwnedEvent($username, $eventId);
        if ($located === null) {
            throw new ApiHttpException(404, 'Calendar event not found.', 'not_found');
        }

        $instance = $located['instance'];
        $object = $located['object'];
        $eventUri = (string) $object->uri;
        $existingEvent = $this->mapper->toCalendarEvent(
            $object,
            (string) $instance->uri,
            $located['veventUid'],
        );
        $eventPayload = $deepMerge
            ? $this->normalizeEventPayload(
                CalendarConversionSupport::deepMergeEventPatch($existingEvent, $payload),
                $existingEvent,
            )
            : $this->normalizeEventPayload($payload, $existingEvent);

        $eventPayload['id'] = $existingEvent['id'] ?? $eventId;
        if ($located['veventUid'] !== null) {
            $eventPayload['uid'] = $located['veventUid'];
        } else {
            $eventPayload['uid'] = $existingEvent['uid'] ?? $eventPayload['uid'] ?? null;
        }
        $eventPayload['calendarIds'] = [(string) $instance->uri => true];

        $raw = is_string($object->calendardata) ? $object->calendardata : (string) $object->calendardata;
        $ics = $this->mapper->updateIcs($raw, $eventPayload, $located['veventUid']);
        $calendarId = (int) $object->calendarid;
        $this->calBackend()->updateCalendarObject($this->calBackendCalendarId($instance), $eventUri, $ics);
        $this->syncSearchIndex(fn () => $this->searchIndexer->indexCalendarObjectFromPath(
            $this->calDavPath($username, (string) $instance->uri, $eventUri)
        ));

        $updated = $this->findObjectInCalendar($calendarId, $eventUri, fresh: true);
        if ($updated === null) {
            throw new ApiHttpException(500, 'Could not load updated calendar event.', 'server_error');
        }

        return $this->mapper->toCalendarEvent(
            $updated,
            (string) $instance->uri,
            $located['veventUid'],
        );
    }

    /**
     * @param  array<string, mixed>  $payload
     */
    private function resolveCalendarFromPayload(string $username, array $payload): CalendarInstance
    {
        $calendarIds = $payload['calendarIds'] ?? null;
        if (! is_array($calendarIds) || $calendarIds === []) {
            throw new ApiHttpException(400, 'calendarIds is required.', 'bad_request');
        }

        $calendarUri = null;
        foreach ($calendarIds as $id => $enabled) {
            if ($enabled === true) {
                $calendarUri = (string) $id;
                break;
            }
        }

        if ($calendarUri === null || $calendarUri === '') {
            throw new ApiHttpException(400, 'calendarIds is required.', 'bad_request');
        }

        $instance = $this->findOwnedCalendar($username, $calendarUri);
        if ($instance === null) {
            throw new ApiHttpException(404, 'Calendar not found.', 'not_found');
        }

        return $instance;
    }

    /**
     * @param  array<string, mixed>  $payload
     * @param  array<string, mixed>|null  $existingEvent
     * @return array<string, mixed>
     */
    private function normalizeEventPayload(array $payload, ?array $existingEvent = null): array
    {
        $event = $payload;
        unset($event['id'], $event['x-wgw-icsMultiEvent']);

        if (! isset($event['start']) || ! is_string($event['start']) || trim($event['start']) === '') {
            if ($existingEvent !== null && isset($existingEvent['start']) && is_string($existingEvent['start'])) {
                $event['start'] = $existingEvent['start'];
            } else {
                throw new ApiHttpException(400, 'start is required.', 'bad_request');
            }
        }

        return CalendarConversionSupport::normalizeEventMapKeys($event, $existingEvent);
    }

    /**
     * @param  array<string, mixed>  $payload
     */
    private function allocateEventUri(int $calendarId, array $payload): string
    {
        for ($attempt = 0; $attempt < 5; $attempt++) {
            $candidate = CalendarEventMapper::generateEventUri($payload);
            if ($this->findObjectInCalendar($calendarId, $candidate) === null) {
                return $candidate;
            }
        }

        throw new ApiHttpException(500, 'Could not allocate calendar event id.', 'server_error');
    }

    /**
     * @return array{object: CalendarObject, instance: CalendarInstance, calendarUri: string, veventUid: string|null}|null
     */
    private function findOwnedEvent(string $username, string $eventId): ?array
    {
        $parsed = CalendarConversionSupport::parseEventId($eventId);
        $eventUri = CalendarEventMapper::eventUriFromId($eventId);
        $object = CalendarObject::query()
            ->where('uri', $eventUri)
            ->whereHas('calendar.instances', function ($query) use ($username): void {
                $query->where('principaluri', $this->principalUri($username));
            })
            ->first();

        if ($object === null) {
            return null;
        }

        $instance = CalendarInstance::query()
            ->where('calendarid', (int) $object->calendarid)
            ->where('principaluri', $this->principalUri($username))
            ->first();

        if ($instance === null) {
            return null;
        }

        $veventUid = $parsed['veventUid'];
        if ($veventUid === null) {
            $events = $this->mapper->toCalendarEvents($object, (string) $instance->uri);
            if (count($events) > 1) {
                return null;
            }
        } else {
            $found = false;
            foreach ($this->mapper->toCalendarEvents($object, (string) $instance->uri) as $event) {
                if (($event['uid'] ?? '') === $veventUid) {
                    $found = true;
                    break;
                }
            }
            if (! $found) {
                return null;
            }
        }

        return [
            'object' => $object,
            'instance' => $instance,
            'calendarUri' => (string) $instance->uri,
            'veventUid' => $veventUid,
        ];
    }

    private function findOwnedCalendar(string $username, string $calendarId): ?CalendarInstance
    {
        return CalendarInstance::query()
            ->where('principaluri', $this->principalUri($username))
            ->where('uri', $calendarId)
            ->first();
    }

    private function findObjectInCalendar(int $calendarId, string $eventUri, bool $fresh = false): ?CalendarObject
    {
        $object = CalendarObject::query()
            ->where('calendarid', $calendarId)
            ->where('uri', $eventUri)
            ->first();

        if ($object !== null && $fresh) {
            $object->refresh();
        }

        return $object;
    }

    private function calDavPath(string $username, string $calendarUri, string $eventUri): string
    {
        return 'calendars/'.$username.'/'.$calendarUri.'/'.$eventUri;
    }

    private function principalUri(string $username): string
    {
        return 'principals/'.$username;
    }

    private function calBackend(): CalPDO
    {
        return new CalPDO(DB::connection('wgw')->getPdo());
    }

    /**
     * @return array{0: int, 1: int}
     */
    private function calBackendCalendarId(CalendarInstance $instance): array
    {
        return [(int) $instance->calendarid, (int) $instance->id];
    }

    private function syncSearchIndex(callable $callback): void
    {
        try {
            $callback();
        } catch (QueryException) {
            // Search index is optional in some test and bootstrap contexts.
        } catch (\Throwable) {
            // Search sync should never block calendar writes.
        }
    }
}
