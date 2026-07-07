<?php

declare(strict_types=1);

namespace App\Services\Tasks;

use App\Exceptions\ApiHttpException;
use App\Models\CalendarInstance;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Sabre\CalDAV\Backend\PDO as CalPDO;
use Sabre\CalDAV\Plugin as CalDAVPlugin;
use Sabre\CalDAV\Xml\Property\SupportedCalendarComponentSet;
use Sabre\DAV\Exception\BadRequest;
use Sabre\DAV\PropPatch;

final class TaskListRepository
{
    public function __construct(private readonly InboxTaskListProvisioner $inboxProvisioner) {}

    public function list(string $username): array
    {
        $principalUri = $this->principalUri($username);
        $this->inboxProvisioner->ensureForPrincipal($principalUri);

        $instances = CalendarInstance::query()
            ->with('calendar')
            ->where('principaluri', $principalUri)
            ->whereHas('calendar', fn ($query) => $query->where('components', 'VTODO'))
            ->orderBy('calendarorder')
            ->orderBy('id')
            ->get();

        return ['list' => $instances->map(fn (CalendarInstance $i): array => $this->mapTaskList($i))->values()->all()];
    }

    public function show(string $username, string $taskListId): array
    {
        $instance = $this->findOwnedTaskList($username, $taskListId);
        if ($instance === null) {
            throw new ApiHttpException(404, 'Task list not found.', 'not_found');
        }

        return $this->mapTaskList($instance);
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
            $properties['{'.CalDAVPlugin::NS_CALDAV.'}calendar-color'] = trim($payload['color']);
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
            $mutations['{'.CalDAVPlugin::NS_CALDAV.'}calendar-color'] = is_string($color) && trim($color) !== '' ? trim($color) : null;
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
            ->whereHas('calendar', fn ($query) => $query->where('components', 'VTODO'))
            ->orderBy('uri')
            ->get();

        $currentState = $this->computeInstancesState($instances);
        $previous = $this->parseInstancesState($since);

        if ($since === null || $since === '' || $since === '0') {
            return ['oldState' => '0', 'newState' => $currentState, 'created' => $instances->pluck('uri')->map(fn ($u): string => (string) $u)->all(), 'updated' => [], 'destroyed' => []];
        }
        if ($since === $currentState) {
            return ['oldState' => $since, 'newState' => $currentState, 'created' => [], 'updated' => [], 'destroyed' => []];
        }
        if ($previous === null) {
            throw new ApiHttpException(400, 'Sync state is invalid or expired.', 'cannotCalculateChanges');
        }

        $currentMap = [];
        foreach ($instances as $instance) {
            $currentMap[(string) $instance->uri] = (int) ($instance->calendar?->synctoken ?? 1);
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
        return CalendarInstance::query()
            ->with('calendar')
            ->where('principaluri', $this->principalUri($username))
            ->where('uri', $taskListId)
            ->whereHas('calendar', fn ($query) => $query->where('components', 'VTODO'))
            ->first();
    }

    private function allocateTaskListUri(string $username, ?string $requestedId, string $name): string
    {
        if ($requestedId !== null && $requestedId !== '') {
            if (in_array($requestedId, ['default', InboxTaskListProvisioner::URI], true) || $this->findOwnedTaskList($username, $requestedId) !== null) {
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
            $parts[] = (string) $instance->uri.':'.(int) ($instance->calendar?->synctoken ?? 1);
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

    private function mapTaskList(CalendarInstance $instance): array
    {
        $uri = (string) $instance->uri;
        $name = trim((string) ($instance->displayname ?? '')) ?: $uri;

        return [
            'id' => $uri,
            'role' => $uri === InboxTaskListProvisioner::URI ? 'inbox' : null,
            'name' => $name,
            'description' => is_string($instance->description) && trim($instance->description) !== '' ? trim($instance->description) : null,
            'color' => is_string($instance->calendarcolor) && trim($instance->calendarcolor) !== '' ? trim($instance->calendarcolor) : null,
            'sortOrder' => (int) ($instance->calendarorder ?? $instance->id ?? 0),
            'isDefault' => $uri === InboxTaskListProvisioner::URI,
            'isSubscribed' => true,
            'shareWith' => null,
            'myRights' => [
                'mayReadItems' => true,
                'mayWriteAll' => true,
                'mayWriteOwn' => true,
                'mayUpdatePrivate' => true,
                'mayRSVP' => true,
                'mayAdmin' => false,
                'mayDelete' => $uri !== InboxTaskListProvisioner::URI,
            ],
        ];
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
