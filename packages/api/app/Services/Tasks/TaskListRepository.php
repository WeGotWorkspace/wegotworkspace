<?php

declare(strict_types=1);

namespace App\Services\Tasks;

use App\Exceptions\ApiHttpException;
use App\Models\CalendarInstance;
use App\Models\Principal;
use App\Services\Admin\AdminConstants;
use App\Services\Calendars\CalendarCollectionUris;
use App\Services\Calendars\UserCalendarCollectionsProvisioner;
use App\Services\Drive\DriveGroupResolver;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Sabre\CalDAV\Backend\PDO as CalPDO;
use Sabre\CalDAV\Plugin as CalDAVPlugin;
use Sabre\CalDAV\Xml\Property\SupportedCalendarComponentSet;
use Sabre\DAV\Exception\BadRequest;
use Sabre\DAV\PropPatch;

final class TaskListRepository
{
    private const CALENDAR_COLOR_PROPERTY = '{http://apple.com/ns/ical/}calendar-color';

    public function __construct(
        private readonly UserCalendarCollectionsProvisioner $calendarCollectionsProvisioner,
        private readonly DriveGroupResolver $groups,
    ) {}

    public function list(string $username): array
    {
        $principalUri = $this->principalUri($username);
        $this->calendarCollectionsProvisioner->ensureForPrincipal($principalUri);

        $instances = CalendarInstance::query()
            ->with('calendar')
            ->where('principaluri', $principalUri)
            ->whereHas('calendar', fn ($query) => $query->vtodoOnly())
            ->orderBy('calendarorder')
            ->orderBy('id')
            ->get();

        $lists = $instances
            ->map(fn (CalendarInstance $i): array => $this->mapTaskList($i))
            ->values()
            ->all();

        foreach ($this->groups->allowedGroupSlugs($username) as $slug) {
            $instance = $this->ensureGroupTaskListInstance($slug);
            if ($instance !== null) {
                $lists[] = $this->mapTaskList($instance, $slug);
            }
        }

        return ['list' => $lists];
    }

    public function show(string $username, string $taskListId): array
    {
        $instance = $this->findAccessibleTaskList($username, $taskListId);
        if ($instance === null) {
            throw new ApiHttpException(404, 'Task list not found.', 'not_found');
        }

        $groupSlug = CalendarCollectionUris::parseGroupTaskListApiId($taskListId);

        return $this->mapTaskList($instance, $groupSlug);
    }

    public function create(string $username, array $payload): array
    {
        $name = trim((string) ($payload['name'] ?? ''));
        if ($name === '') {
            throw new ApiHttpException(400, 'name is required.', 'bad_request');
        }

        $uri = $this->allocateTaskListUri($username, isset($payload['id']) && is_string($payload['id']) ? $payload['id'] : null, $name);
        $properties = [
            '{DAV:}displayname' => $name,
            '{urn:ietf:params:xml:ns:caldav}supported-calendar-component-set' => new SupportedCalendarComponentSet(['VTODO']),
        ];
        if (array_key_exists('description', $payload)) {
            $properties['{'.CalDAVPlugin::NS_CALDAV.'}calendar-description'] = is_string($payload['description']) ? $payload['description'] : null;
        }
        if (array_key_exists('color', $payload) && is_string($payload['color']) && trim($payload['color']) !== '') {
            $properties[self::CALENDAR_COLOR_PROPERTY] = trim($payload['color']);
        }

        try {
            $this->calBackend()->createCalendar($this->principalUri($username), $uri, $properties);
        } catch (BadRequest $exception) {
            throw new ApiHttpException(400, $exception->getMessage(), 'invalidProperties');
        }

        $instance = $this->findOwnedTaskList($username, $uri);
        if ($instance === null) {
            throw new ApiHttpException(500, 'Could not load created task list.', 'server_error');
        }

        return $this->mapTaskList($instance);
    }

    public function update(string $username, string $taskListId, array $payload): array
    {
        $instance = $this->findOwnedTaskList($username, $taskListId);
        if ($instance === null) {
            throw new ApiHttpException(404, 'Task list not found.', 'not_found');
        }

        $mutations = [];
        if (array_key_exists('name', $payload)) {
            $name = trim((string) $payload['name']);
            if ($name === '') {
                throw new ApiHttpException(400, 'name must not be empty.', 'invalidProperties');
            }
            $mutations['{DAV:}displayname'] = $name;
        }
        if (array_key_exists('description', $payload)) {
            $mutations['{'.CalDAVPlugin::NS_CALDAV.'}calendar-description'] = is_string($payload['description']) ? $payload['description'] : null;
        }
        if (array_key_exists('color', $payload)) {
            $color = $payload['color'];
            $mutations[self::CALENDAR_COLOR_PROPERTY] = is_string($color) && trim($color) !== '' ? trim($color) : null;
        }

        if ($mutations !== []) {
            $propPatch = new PropPatch($mutations);
            $this->calBackend()->updateCalendar($this->calBackendCalendarId($instance), $propPatch);
            $propPatch->commit();
        }

        $instance->refresh();

        return $this->mapTaskList($instance);
    }

    public function delete(string $username, string $taskListId, array $options = []): array
    {
        $instance = $this->findOwnedTaskList($username, $taskListId);
        if ($instance === null) {
            throw new ApiHttpException(404, 'Task list not found.', 'not_found');
        }
        if ((string) $instance->uri === InboxTaskListProvisioner::URI) {
            throw new ApiHttpException(403, 'The Inbox task list cannot be deleted.', 'forbidden');
        }
        if ($instance->objects()->where('componenttype', 'VTODO')->exists() && ! ($options['onDestroyRemoveContents'] ?? false)) {
            throw new ApiHttpException(409, 'Task list contains tasks.', 'taskListHasContents');
        }

        $this->calBackend()->deleteCalendar($this->calBackendCalendarId($instance));

        return ['ok' => true];
    }

    public function changes(string $username, ?string $since): array
    {
        $instances = CalendarInstance::query()
            ->with('calendar')
            ->where('principaluri', $this->principalUri($username))
            ->whereHas('calendar', fn ($query) => $query->vtodoOnly())
            ->orderBy('uri')
            ->get();

        foreach ($this->groups->allowedGroupSlugs($username) as $slug) {
            $groupInstance = $this->ensureGroupTaskListInstance($slug);
            if ($groupInstance !== null) {
                $instances->push($groupInstance);
            }
        }

        $currentState = $this->computeInstancesState($instances);
        $previous = $this->parseInstancesState($since);

        if ($since === null || $since === '' || $since === '0') {
            return ['oldState' => '0', 'newState' => $currentState, 'created' => $this->apiIdsForInstances($instances), 'updated' => [], 'destroyed' => []];
        }
        if ($since === $currentState) {
            return ['oldState' => $since, 'newState' => $currentState, 'created' => [], 'updated' => [], 'destroyed' => []];
        }
        if ($previous === null) {
            throw new ApiHttpException(400, 'Sync state is invalid or expired.', 'cannotCalculateChanges');
        }

        $currentMap = [];
        foreach ($instances as $instance) {
            $currentMap[$this->apiIdForInstance($instance)] = (int) ($instance->calendar?->synctoken ?? 1);
        }
        $created = [];
        $updated = [];
        foreach ($currentMap as $uri => $token) {
            if (! array_key_exists($uri, $previous)) {
                $created[] = $uri;
            } elseif ($previous[$uri] !== $token) {
                $updated[] = $uri;
            }
        }
        $destroyed = [];
        foreach (array_keys($previous) as $uri) {
            if (! array_key_exists($uri, $currentMap)) {
                $destroyed[] = $uri;
            }
        }

        return ['oldState' => $since, 'newState' => $currentState, 'created' => $created, 'updated' => $updated, 'destroyed' => $destroyed];
    }

    public function findOwnedTaskList(string $username, string $taskListId): ?CalendarInstance
    {
        if (CalendarCollectionUris::parseGroupTaskListApiId($taskListId) !== null) {
            return null;
        }

        return CalendarInstance::query()
            ->with('calendar')
            ->where('principaluri', $this->principalUri($username))
            ->where('uri', $taskListId)
            ->whereHas('calendar', fn ($query) => $query->vtodoOnly())
            ->first();
    }

    public function findAccessibleTaskList(string $username, string $taskListId): ?CalendarInstance
    {
        $groupSlug = CalendarCollectionUris::parseGroupTaskListApiId($taskListId);
        if ($groupSlug !== null) {
            if (! in_array($groupSlug, $this->groups->allowedGroupSlugs($username), true)) {
                return null;
            }

            return $this->ensureGroupTaskListInstance($groupSlug);
        }

        return $this->findOwnedTaskList($username, $taskListId);
    }

    public function apiIdForInstance(CalendarInstance $instance): string
    {
        $groupSlug = $this->groupSlugFromPrincipalUri((string) $instance->principaluri);
        if ($groupSlug !== null) {
            return CalendarCollectionUris::groupTaskListApiId($groupSlug);
        }

        return (string) $instance->uri;
    }

    private function allocateTaskListUri(string $username, ?string $requestedId, string $name): string
    {
        if ($requestedId !== null && $requestedId !== '') {
            if (
                in_array($requestedId, CalendarCollectionUris::reservedTaskUriSlugs(), true)
                || $this->findOwnedTaskList($username, $requestedId) !== null
            ) {
                throw new ApiHttpException(409, 'Task list id already exists.', 'alreadyExists');
            }

            return $requestedId;
        }
        $base = Str::slug($name, '-') ?: 'tasks';
        $candidate = $base;
        $suffix = 2;
        while ($this->findOwnedTaskList($username, $candidate) !== null) {
            $candidate = $base.'-'.$suffix;
            $suffix++;
        }

        return $candidate;
    }

    private function computeInstancesState($instances): string
    {
        $parts = [];
        foreach ($instances as $instance) {
            $parts[] = $this->apiIdForInstance($instance).':'.(int) ($instance->calendar?->synctoken ?? 1);
        }

        return (string) count($parts).':'.implode(',', $parts);
    }

    private function parseInstancesState(?string $state): ?array
    {
        if ($state === null || $state === '' || $state === '0') {
            return [];
        }
        if (! preg_match('/^(\d+):(.+)$/', $state, $matches)) {
            return null;
        }
        $entries = $matches[2] === '' ? [] : explode(',', $matches[2]);
        if (count($entries) !== (int) $matches[1]) {
            return null;
        }
        $map = [];
        foreach ($entries as $entry) {
            $parts = explode(':', $entry, 2);
            if (count($parts) !== 2 || $parts[0] === '' || ! ctype_digit($parts[1])) {
                return null;
            }
            $map[$parts[0]] = (int) $parts[1];
        }

        return $map;
    }

    private function calBackendCalendarId(CalendarInstance $instance): array
    {
        return [(int) $instance->calendarid, (int) $instance->id];
    }

    private function mapTaskList(CalendarInstance $instance, ?string $groupSlug = null): array
    {
        $uri = (string) $instance->uri;
        $name = trim((string) ($instance->displayname ?? '')) ?: $uri;
        $isGroup = $groupSlug !== null;

        return [
            'id' => $isGroup ? CalendarCollectionUris::groupTaskListApiId($groupSlug) : $uri,
            'role' => match (true) {
                $isGroup => 'group',
                $uri === InboxTaskListProvisioner::URI => 'inbox',
                $uri === CalendarCollectionUris::TASK_HOME => 'home',
                $uri === CalendarCollectionUris::TASK_WORK => 'work',
                default => null,
            },
            'name' => $name,
            'description' => is_string($instance->description) && trim($instance->description) !== '' ? trim($instance->description) : null,
            'color' => is_string($instance->calendarcolor) && trim($instance->calendarcolor) !== '' ? trim($instance->calendarcolor) : null,
            'sortOrder' => (int) ($instance->calendarorder ?? $instance->id ?? 0),
            'isDefault' => ! $isGroup && $uri === InboxTaskListProvisioner::URI,
            'isSubscribed' => true,
            'scope' => $isGroup ? 'group' : 'personal',
            'groupSlug' => $isGroup ? $groupSlug : null,
            'shareWith' => null,
            'myRights' => [
                'mayReadItems' => true,
                'mayWriteAll' => true,
                'mayWriteOwn' => true,
                'mayUpdatePrivate' => true,
                'mayRSVP' => true,
                'mayAdmin' => false,
                'mayDelete' => ! $isGroup && $uri !== InboxTaskListProvisioner::URI,
            ],
        ];
    }

    private function ensureGroupTaskListInstance(string $groupSlug): ?CalendarInstance
    {
        $groupUri = AdminConstants::GROUP_PREFIX.$groupSlug;
        $group = Principal::query()->where('uri', $groupUri)->first(['uri', 'displayname']);
        if ($group === null) {
            return null;
        }

        $this->calendarCollectionsProvisioner->ensureForGroupPrincipal(
            (string) $group->uri,
            (string) ($group->displayname ?? $groupSlug),
        );

        return CalendarInstance::query()
            ->with('calendar')
            ->where('principaluri', $groupUri)
            ->where('uri', CalendarCollectionUris::groupTaskListCalDavUri($groupSlug))
            ->whereHas('calendar', fn ($query) => $query->vtodoOnly())
            ->first();
    }

    private function groupSlugFromPrincipalUri(string $principalUri): ?string
    {
        if (! str_starts_with($principalUri, AdminConstants::GROUP_PREFIX)) {
            return null;
        }

        $slug = substr($principalUri, strlen(AdminConstants::GROUP_PREFIX));

        return $slug !== '' ? $slug : null;
    }

    /**
     * @param  iterable<CalendarInstance>  $instances
     * @return list<string>
     */
    private function apiIdsForInstances(iterable $instances): array
    {
        $ids = [];
        foreach ($instances as $instance) {
            $ids[] = $this->apiIdForInstance($instance);
        }

        return $ids;
    }

    private function principalUri(string $username): string
    {
        return 'principals/'.$username;
    }

    private function calBackend(): CalPDO
    {
        return new CalPDO(DB::connection('wgw')->getPdo());
    }
}
