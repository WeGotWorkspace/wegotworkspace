# Optimistic concurrency (Contacts REST)

Contacts cards share CardDAV storage (`cards.etag`, `cards.lastmodified`).

## GET

- `GET /contacts/cards/{cardId}` returns:
  - `ETag` response header (quoted Sabre etag)
  - `etag` field on the ContactCard JSON body
  - `updated` timestamp when available

## Mutations

`PUT`, `PATCH`, and `DELETE` require **`If-Match`** (or **`If-Unmodified-Since`** as fallback).

| Condition | Status | `code` |
|-----------|--------|--------|
| Missing precondition header | 412 | `precondition_failed` |
| Stale `If-Match` / `If-Unmodified-Since` | 412 | `precondition_failed` |

Clients should read the token from the latest GET (header or body), send it on the next mutation, and refresh after a successful write.
