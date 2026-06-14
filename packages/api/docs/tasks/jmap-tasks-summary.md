# JMAP Tasks API summary

REST endpoints under `/api/v1/tasks/*` expose a **JMAP Tasks-shaped** JSON contract backed by **CalDAV VTODO** persistence (`calendarinstances`, `calendarobjects` on the `wgw` connection).

## Field subset (v1)

| JMAP Task field | Source |
|-----------------|--------|
| `id` | CalDAV object uri (without `.ics`) or `{uri}#{uid}` for multi-VTODO |
| `taskListId` | `calendarinstances.uri` (VTODO-capable calendars only) |
| `uid` | VTODO `UID` |
| `title` | `SUMMARY` |
| `description` | `DESCRIPTION` |
| `start` / `due` | `DTSTART` / `DUE` |
| `completed` | `COMPLETED` |
| `workflowStatus` | `STATUS` |
| `progress` | `PERCENT-COMPLETE` |
| `priority` | `PRIORITY` (mapped 1↔10 scale) |
| `categories` | `CATEGORIES` |
| `privacy` | `CLASS` |
| `recurrenceRules` | `RRULE` |
| `excludedRecurrenceDates` | `EXDATE` |
| `recurrenceOverrides` | `RECURRENCE-ID` override VTODOs |
| `alerts` | `VALARM` |
| `participants` | `ORGANIZER` / `ATTENDEE` |
| `showWithoutTime` / `timeZone` | `VALUE=DATE` / `TZID` on `DTSTART`/`DUE` |
| `icsProps` | Unmapped VTODO properties (round-trip escape hatch) |

**Implemented (platform #157 / #158):** task list collection CRUD, `GET /tasks/tasklists/changes`, and `POST /tasks/items/query` (uid + inTaskList) — see `docs/contacts/jmap-collection-crud.md` and `docs/contacts/jmap-sync-rest-mapping.md`.

Deferred in v1: task item `/changes`, JMAP protocol transport, instance expansion (client-side).

## Access

- Auth: `wgw.auth` + `wgw.role:user`
- Gate: `calendar_enabled` via `EnsureCalendarsEnabled` middleware (`wgw.calendars`)

See [ics-jmap-task-conversion-matrix.md](ics-jmap-task-conversion-matrix.md) for VTODO mapping details.
