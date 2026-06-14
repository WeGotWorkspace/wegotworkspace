# VTODO ↔ JMAP Task conversion matrix

## Identity

| Direction | Rule |
|-----------|------|
| TaskList.id | `calendarinstances.uri` where parent calendar `components` includes `VTODO` |
| Task.id (single VTODO) | `calendarobjects.uri` without `.ics` suffix |
| Task.id (multi-VTODO) | `{objectUriWithoutSuffix}#{vtodoUid}` |
| Task.uid | VTODO `UID` property |

## Property mapping

| VTODO (RFC 5545) | JMAP Task |
|------------------|-----------|
| `SUMMARY` | `title` |
| `DESCRIPTION` | `description` |
| `DTSTART` | `start` (LocalDateTime) |
| `DUE` | `due` (LocalDateTime) |
| `COMPLETED` | `completed` (UTCDateTime) |
| `STATUS: NEEDS-ACTION` | `workflowStatus: needs-action` |
| `STATUS: IN-PROCESS` | `workflowStatus: in-process` |
| `STATUS: COMPLETED` | `workflowStatus: completed` |
| `STATUS: CANCELLED` | `workflowStatus: cancelled` |
| `PERCENT-COMPLETE` | `progress` (0–100) |
| `PRIORITY` (1=highest…9=lowest) | `priority` (1=highest…10=lowest): `10 - ical + 1` |
| `CATEGORIES` | `categories[]` |
| `CLASS: PUBLIC` | `privacy: public` |
| `CLASS: PRIVATE` | `privacy: private` |
| `CLASS: CONFIDENTIAL` | `privacy: secret` |
| `RRULE` | `recurrenceRules[]` |
| `EXDATE` | `excludedRecurrenceDates[]` |
| `RECURRENCE-ID` override VTODO | `recurrenceOverrides[recurrenceId]` |
| `VALARM` | `alerts` (IdMap) |

## Recurrence

| Direction | Rule |
|-----------|------|
| ICS → JMAP | Parse RRULE into `RecurrenceRule` objects; group VTODO components sharing a `UID` into one Task |
| ICS → JMAP overrides | VTODO with `RECURRENCE-ID` become `recurrenceOverrides` patches; `STATUS:CANCELLED` → `excluded: true` |
| JMAP → ICS | Serialize `recurrenceRules` to RRULE; `excludedRecurrenceDates` and `recurrenceOverrides.excluded` → EXDATE |
| JMAP → ICS overrides | Each non-excluded `recurrenceOverrides` entry writes a sibling VTODO with `RECURRENCE-ID` |
| Instance expansion | **Client responsibility** — server stores RRULE only, consistent with JMAP Tasks draft |

## Alerts

| Direction | Rule |
|-----------|------|
| ICS → JMAP | Each `VALARM` under VTODO → `alerts` entry with `OffsetTrigger` or `AbsoluteTrigger` |
| Offset trigger | `TRIGGER` duration; `RELATED=END` → `relativeTo: end` (due), default → `relativeTo: start` |
| JMAP → ICS | Each alert writes a `VALARM` sub-component under the master VTODO |

## Write semantics

- **Create:** always writes a single-VTODO `.ics` object via CalPDO `createCalendarObject` (plus override VTODOs when `recurrenceOverrides` present).
- **Update/PATCH:** replaces all VTODO components with matching `UID`; preserves unrelated VTODO in multi-UID blobs.
- **Delete:** removes all VTODO with matching `UID`, or deletes the object when empty.

## Deferred

- `VTIMEZONE` / custom time zones
- JMAP extensions: assignees, multilingual titles
- `icsProps` escape hatch (#149)
