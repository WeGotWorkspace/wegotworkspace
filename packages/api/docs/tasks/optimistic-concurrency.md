# Optimistic concurrency (Tasks REST)

Tasks are stored as CalDAV `VTODO` calendar objects (`calendarobjects.etag`).

## GET

- `GET /tasks/items/{taskId}` returns `ETag` header and `etag` on the Task JSON.

## Mutations

`PUT`, `PATCH`, and `DELETE` require `If-Match` or `If-Unmodified-Since`.

Multi-VTODO composite ids behave like calendar multi-VEVENT blobs: one shared object etag per `.ics` resource.

Stale tokens return **412** with `code: precondition_failed`.
