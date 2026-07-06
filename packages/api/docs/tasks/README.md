# Tasks API documentation

JMAP-shaped REST over CalDAV VTODO persistence.

**Canonical architecture:** [`docs/architecture/tasks.md`](../../../../docs/architecture/tasks.md)

**Epic / REST implementation:** [#134](https://github.com/WeGotWorkspace/wegotworkspace/issues/134)

## Documents (with #134)

| File | Purpose |
|------|---------|
| [jmap-tasks-summary.md](./jmap-tasks-summary.md) | JMAP Tasks draft subset, REST endpoints, capabilities |
| [ics-jmap-task-conversion-matrix.md](./ics-jmap-task-conversion-matrix.md) | VTODO ↔ Task field mapping, multi-VTODO ids, recurrence |

## Related

- [jmap-rest-parity-gaps.md](../jmap-rest-parity-gaps.md) — v1 scope vs CalDAV/JMAP gaps
- [jmap-sync-rest-mapping.md](../contacts/jmap-sync-rest-mapping.md) — `/changes` token strategy for tasks
- [jmap-collection-crud.md](../contacts/jmap-collection-crud.md) — task list REST read-only v1
- OpenAPI: `packages/api/openapi/schemas/tasks/`, paths `/tasks/tasklists`, `/tasks/items`

## REST paths (canonical)

Use **`/tasks/items`** (not `/tasks/tasks`) — matches OpenAPI and `routes/api.php` on `main`.
