# JMAP incremental sync — REST mapping (contacts pilot)

> **Issue:** [#158](https://github.com/WeGotWorkspace/wegotworkspace/issues/158)  
> **Spec:** [RFC 9610](https://www.rfc-editor.org/info/rfc9610) (Contacts), [RFC 8620](https://www.rfc-editor.org/info/rfc8620) (JMAP core `/changes`, `/query`)

WeGotWorkspace exposes a **REST subset** of JMAP sync methods for contacts. Calendars and tasks document the same token strategy below; REST endpoints for those domains are planned after the contacts pilot.

## Sync tokens

| JMAP type | REST endpoint | State token source |
|-----------|---------------|-------------------|
| `AddressBook` | `GET /api/v1/contacts/addressbooks/changes?since=` | Composite `{count}:{uri:synctoken,...}` over owned books |
| `ContactCard` | `GET /api/v1/contacts/cards/changes?addressBookId=&since=` | Sabre CardDAV `addressbooks.synctoken` + `addressbookchanges` |

### Response shape (both endpoints)

```json
{
  "oldState": "5",
  "newState": "12",
  "created": ["card-id"],
  "updated": ["card-id"],
  "destroyed": ["card-id"]
}
```

Maps to JMAP `/changes` (`oldState`, `newState`, `created`, `updated`, `destroyed`).

- **`since` omitted or `0`:** initial sync — all current ids appear in `created`.
- **`since` unknown / malformed:** `400` with `cannotCalculateChanges` (JMAP equivalent).
- **Card ids:** REST ids strip the `.vcf` suffix from CardDAV object uris.

### WebDAV alternative

Clients may also use CardDAV **sync-collection REPORT** against `/addressbooks/{user}/{book}/` with `{http://sabredav.org/ns}sync-token`. REST `/changes` reads the same underlying `synctoken` / `addressbookchanges` tables.

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

## Calendars and tasks (documented strategy)

Calendar collections and VEVENT/VTODO objects use the same Sabre pattern:

| Store | Token column | Changes table |
|-------|--------------|---------------|
| Calendars | `calendarinstances.synctoken` (via backend) | `calendarchanges` |
| Events / tasks | per-calendar synctoken | `calendarchanges` rows |

**Planned REST mapping (not yet implemented):**

- `GET /calendars/calendars/changes?since=`
- `GET /calendars/events/changes?calendarId=&since=`
- `GET /tasks/tasklists/changes?since=`
- `GET /tasks/items/changes?taskListId=&since=`

**ETag alternative:** `CalendarEvent` and `Task` responses already expose `etag` (from `calendarobjects.etag`). Clients may use `If-Match` on PUT/PATCH/DELETE for optimistic concurrency without polling `/changes`.

## Non-goals (v1)

- `ContactCard/queryChanges` (query result pagination sync)
- `ContactCard/copy`
- Full RFC 9610 filter matrix (`text`, `hasMember`, date ranges, …)
- Cross-account shared collection sync (RFC 9670 — see collection CRUD docs)

## Related

- [rfc9610-summary.md](./rfc9610-summary.md) — domain field mapping
- [jmap-rest-parity-gaps.md](../jmap-rest-parity-gaps.md) — epic tracker
