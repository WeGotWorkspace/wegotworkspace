# JMAP incremental sync — REST mapping

> **Issue:** [#158](https://github.com/WeGotWorkspace/wegotworkspace/issues/158)  
> **Spec:** [RFC 9610](https://www.rfc-editor.org/info/rfc9610) (Contacts), [RFC 8620](https://www.rfc-editor.org/info/rfc8620) (JMAP core `/changes`, `/query`)

WeGotWorkspace exposes a **REST subset** of JMAP sync methods. Contacts were the pilot; calendars and tasks now expose collection `/changes` and tasks expose item `/query`.

## Sync tokens

| JMAP type | REST endpoint | State token source |
|-----------|---------------|-------------------|
| `AddressBook` | `GET /api/v1/contacts/addressbooks/changes?since=` | Composite `{count}:{uri:synctoken,...}` over owned books |
| `ContactCard` | `GET /api/v1/contacts/cards/changes?addressBookId=&since=` | Sabre CardDAV `addressbooks.synctoken` + `addressbookchanges` |
| `Calendar` | `GET /api/v1/calendars/calendars/changes?since=` | Composite `{count}:{uri:synctoken,...}` over owned VEVENT calendars |
| `TaskList` | `GET /api/v1/tasks/tasklists/changes?since=` | Composite `{count}:{uri:synctoken,...}` over owned VTODO calendars |

### Response shape (collection + card changes)

```json
{
  "oldState": "5",
  "newState": "12",
  "created": ["id"],
  "updated": ["id"],
  "destroyed": ["id"]
}
```

Maps to JMAP `/changes` (`oldState`, `newState`, `created`, `updated`, `destroyed`).

- **`since` omitted or `0`:** initial sync — all current ids appear in `created`.
- **`since` unknown / malformed:** `400` with `cannotCalculateChanges` (JMAP equivalent).
- **Card ids:** REST ids strip the `.vcf` suffix from CardDAV object uris.

### WebDAV alternative

Clients may also use CardDAV **sync-collection REPORT** against `/addressbooks/{user}/{book}/` with `{http://sabredav.org/ns}sync-token`. REST `/changes` reads the same underlying `synctoken` / `addressbookchanges` tables.

CalDAV calendar collections expose synctoken on `calendarinstances`; REST collection `/changes` reads the same `calendars.synctoken` values.

## ContactCard/query

| JMAP filter (RFC 9610) | REST support |
|------------------------|--------------|
| `inAddressBook` | **Required** on `POST /contacts/cards/query` and `GET /contacts/cards?addressBookId=` |
| `uid` | **Supported** on query POST body and `GET ?uid=` |
| `text`, `name`, `email`, … | **Deferred** — use unified search or full list + client filter |

### Contact/set (batch writes)

`POST /api/v1/contacts/cards/set` implements JMAP `Contact/set`:

- `create` — map of creation id → ContactCard body
- `update` — map of card id → patch fields plus optional `ifInState`
- `destroy` — id array (force) or map of id → `{ ifInState }`

Responses use `created`, `updated`, `destroyed`, and `not*` buckets. Stale `ifInState` yields `notUpdated` / `notDestroyed` entries with `type: stateMismatch`.

Per-contact opaque `state` tokens are stored in `jmap_contact_states` and returned on `Contact/get` responses (alongside legacy `etag` for REST PATCH).

### Query request (POST)

```json
POST /api/v1/contacts/cards/query
{
  "filter": { "inAddressBook": "default", "uid": "urn:uuid:…" },
  "limit": 50
}
```

Response: `{ "ids": ["…"], "total": 1 }` — fetch full cards via `GET /contacts/cards/{id}`.

## Task/query

| JMAP filter | REST support |
|-------------|--------------|
| `inTaskList` | **Required** on `POST /tasks/items/query` |
| `uid` | **Supported** on query POST body |
| Other filters | **Deferred** |

### Query request (POST)

```json
POST /api/v1/tasks/items/query
{
  "filter": { "inTaskList": "default", "uid": "urn:uuid:…" },
  "limit": 50
}
```

Response: `{ "ids": ["…"], "total": 1 }` — fetch full tasks via `GET /tasks/items/{id}`.

## Events and tasks (item-level sync)

Calendar events and task items use per-calendar synctoken via `calendarchanges`, but REST item `/changes` endpoints are **not yet implemented**.

| Store | Token column | Changes table |
|-------|--------------|---------------|
| Calendars / task lists | `calendars.synctoken` (via backend) | `calendarchanges` |
| Events / tasks | per-calendar synctoken | `calendarchanges` rows |

**Planned REST mapping (deferred):**

- `GET /calendars/events/changes?calendarId=&since=`
- `GET /tasks/items/changes?taskListId=&since=`

**ETag alternative:** `CalendarEvent` and `Task` responses expose `etag` (from `calendarobjects.etag`). Clients may use `If-Match` on PUT/PATCH/DELETE for optimistic concurrency without polling `/changes`.

## Non-goals (v1)

- `ContactCard/queryChanges` (query result pagination sync)
- `ContactCard/copy`
- Full RFC 9610 filter matrix (`text`, `hasMember`, date ranges, …)
- Cross-account shared collection sync (RFC 9670 — see collection CRUD docs)

## Related

- [rfc9610-summary.md](./rfc9610-summary.md) — domain field mapping
- [jmap-rest-parity-gaps.md](../jmap-rest-parity-gaps.md) — epic tracker
