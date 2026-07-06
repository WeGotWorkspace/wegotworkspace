# VTODO ↔ JMAP Task conversion matrix

> **Issue:** [#134](https://github.com/WeGotWorkspace/wegotworkspace/issues/134)  
> **Architecture:** [docs/architecture/tasks.md](../../../../docs/architecture/tasks.md)

**Status:** Stub — populate with golden fixtures when `IcsJmapTaskConverter` lands ([#134](https://github.com/WeGotWorkspace/wegotworkspace/issues/134)).

## Summary table

See property mapping in [docs/architecture/tasks.md](../../../../docs/architecture/tasks.md#property-mapping-vtodo--rest-task). Parity gaps tracked in [jmap-rest-parity-gaps.md](../jmap-rest-parity-gaps.md).

| Area | Issue | Status |
|------|-------|--------|
| Core fields (title, dates, status, priority) | #134 | v1 baseline |
| Recurrence (RRULE, overrides) | [#146](https://github.com/WeGotWorkspace/wegotworkspace/issues/146) | P0 gap |
| VALARM ↔ alerts | [#147](https://github.com/WeGotWorkspace/wegotworkspace/issues/147) | P0 gap |
| Assignees | [#148](https://github.com/WeGotWorkspace/wegotworkspace/issues/148) | P1 |
| `icsProps` escape hatch | [#149](https://github.com/WeGotWorkspace/wegotworkspace/issues/149) | P1 |
| TZID / all-day | [#150](https://github.com/WeGotWorkspace/wegotworkspace/issues/150) | P1 |

## Multi-VTODO composite IDs

| Scenario | REST `Task.id` |
|----------|----------------|
| Single VTODO per `.ics` (create) | `{objectUri}` (no `.ics` suffix) |
| Multiple VTODO per `.ics` (read) | `{objectUri}#{vtodoUid}` |

## Recurrence model

**Architecture decision:** JMAP `recurrenceOverrides` / RECURRENCE-ID round-trip — **not** in-place master mutation on complete. Align with Calendar [recurrenceOverrides](../calendars/) ([#139](https://github.com/WeGotWorkspace/wegotworkspace/issues/139)).

## workflowStatus ↔ STATUS

| JMAP `workflowStatus` | VTODO `STATUS` |
|-----------------------|----------------|
| `needs-action` | `NEEDS-ACTION` |
| `in-process` | `IN-PROCESS` |
| `completed` | `COMPLETED` |
| `cancelled` | `CANCELLED` |

## Sections to add with #134

1. Read path (ICS → JMAP) per property group
2. Write path (JMAP → ICS) per property group
3. Non-reversible cases
4. Golden fixture index under `tests/fixtures/Tasks/`
