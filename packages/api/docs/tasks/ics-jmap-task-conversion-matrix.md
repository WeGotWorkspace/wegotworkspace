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

## Write semantics

- **Create:** always writes a single-VTODO `.ics` object via CalPDO `createCalendarObject`.
- **Update/PATCH:** replaces the targeted VTODO; preserves sibling components in multi-VTODO blobs.
- **Delete:** removes one VTODO from a multi-component blob, or deletes the object when empty.

## Deferred

- `RRULE` / recurrence instance expansion
- `VTIMEZONE` / custom time zones
- JMAP extensions: assignees, alerts, multilingual titles
