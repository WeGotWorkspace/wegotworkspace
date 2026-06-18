# Offline platform — adding offline support to a new app

The generic offline platform lives under [`packages/apps/src/lib/offline/core/`](../src/lib/offline/core). It is **app-agnostic**: it owns the per-account Dexie database, a domain table/version registry, generic outbox + meta stores, connectivity detection, serialized sync runners, the hybrid-bootstrap hook, the account-session helpers, a generic conflict channel, outbox coalescing, and the shell offline indicator.

A **domain plugin** registers its tables, implements a small store/flush/operations layer on top of the core, and wires the shared hooks. Contacts + Notes are live Dexie domains that illustrate the patterns.

Docs now uses the collaboration stack for editable text files:

- `Y.Doc` + `y-indexeddb` persistence in `text-editor-core/docs-collab`
- Deferred server save + reconnect flush via `use-docs-collab`
- Drive REST operations only for browse/rename/non-text file actions (`docs-drive-operations.ts`)

## What the core gives you

| Concern                                                                   | Module                                                                                                                             |
| ------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| Dexie factory + version/migration registry                                | [`core/offline-db.ts`](../src/lib/offline/core/offline-db.ts)                                                                      |
| Enforced per-domain Dexie version blocks                                  | [`core/offline-version-allocation.ts`](../src/lib/offline/core/offline-version-allocation.ts)                                      |
| Generic outbox CRUD (`enqueue`/`list`/`remove`/`markError`/`isRetryable`) | [`core/outbox-store.ts`](../src/lib/offline/core/outbox-store.ts)                                                                  |
| Coalesce pending update rows for the same entity                          | [`core/outbox-coalescing.ts`](../src/lib/offline/core/outbox-coalescing.ts)                                                        |
| Key/value meta + sync tokens                                              | [`core/meta-store.ts`](../src/lib/offline/core/meta-store.ts)                                                                      |
| Online/offline detection + snapshots                                      | [`core/browser-online.ts`](../src/lib/offline/core/browser-online.ts) (via [`use-connectivity`](../src/hooks/use-connectivity.ts)) |
| Serialized flush runner + per-account registry                            | [`core/connectivity-sync-runner.ts`](../src/lib/offline/core/connectivity-sync-runner.ts)                                          |
| Cache-then-network bootstrap                                              | [`core/use-hybrid-bootstrap.ts`](../src/lib/offline/core/use-hybrid-bootstrap.ts)                                                  |
| Per-domain account session (`wgw.offline.<domain>.username`)              | [`core/offline-account.ts`](../src/lib/offline/core/offline-account.ts)                                                            |
| Generic conflict channel `createSyncConflictChannel<TId>()`               | [`core/sync-conflicts.ts`](../src/lib/offline/core/sync-conflicts.ts)                                                              |
| Shell "Offline" pill                                                      | [`core/offline-status-indicator.tsx`](../src/lib/offline/core/offline-status-indicator.tsx)                                        |
| Shared type contracts                                                     | [`core/types.ts`](../src/lib/offline/core/types.ts)                                                                                |

The core defines Dexie **version 1** = `{ meta, outbox }`. Each domain owns a **non-overlapping version block** enforced at registration time (see [Version allocation](#version-allocation)). Contacts uses **2–9**, Notes **10–19**.

## Version allocation

Before registering tables, claim a version block in `OFFLINE_DOMAIN_VERSION_RANGES` inside [`offline-version-allocation.ts`](../src/lib/offline/core/offline-version-allocation.ts):

| Domain   | Dexie versions |
| -------- | -------------- |
| core     | 1              |
| contacts | 2–9            |
| notes    | 10–19          |

Claim the next free block for a new domain (e.g. **30–39**). Each version step you register must fall inside your block. `registerOfflineDomainTables` calls `claimOfflineDomainVersions`, which **throws** if:

- the domain has no entry in `OFFLINE_DOMAIN_VERSION_RANGES`;
- a version is outside the allocated range;
- two domains declare the same version number.

Define named constants for your steps (contacts uses `CONTACTS_OFFLINE_VERSION`, notes `NOTES_OFFLINE_VERSION`) so migrations stay readable and stay inside the block.

## Reference implementations

Two shipped Dexie domains cover the main offline shapes. Pick the one closest to your API and copy its file layout.

| Domain   | API shape                          | Cache model                             | Cross-tab sync                                                                                                                                               | Key files                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| -------- | ---------------------------------- | --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Contacts | Entity REST (cards, address books) | Bootstrap + per-entity rows             | —                                                                                                                                                            | [`contacts-schema.ts`](../src/lib/offline/contacts/contacts-schema.ts), [`contacts-offline-store.ts`](../src/lib/offline/contacts-offline-store.ts), [`contacts-outbox-flush.ts`](../src/lib/offline/contacts-outbox-flush.ts), [`contacts-hybrid-operations.ts`](../src/lib/offline/contacts-hybrid-operations.ts), [`contacts/contacts-patch-merge.ts`](../src/lib/offline/contacts/contacts-patch-merge.ts)                              |
| Notes    | Entity REST (notebooks, notes)     | Bootstrap + per-entity rows             | [`notes-bootstrap-sync.ts`](../src/lib/offline/notes-bootstrap-sync.ts) — BroadcastChannel + localStorage fallback notifies other tabs after flush/reconnect | [`notes/notes-schema.ts`](../src/lib/offline/notes/notes-schema.ts), [`notes-offline-store.ts`](../src/lib/offline/notes-offline-store.ts), [`notes-outbox-flush.ts`](../src/lib/offline/notes-outbox-flush.ts), [`notes-hybrid-operations.ts`](../src/lib/offline/notes-hybrid-operations.ts), [`use-notes-api.ts`](../src/notes-core/src/use-notes-api.ts)                                                                                |
| Docs     | Text collaboration + REST sidecar  | `Y.Doc` + `y-indexeddb` per collab room | Yjs provider sync + room-scoped registry (`docs-collab-sync-registry.ts`)                                                                                    | [`use-docs-collab.ts`](../src/text-editor-core/docs-collab/use-docs-collab.ts), [`docs-collab-persistence.ts`](../src/text-editor-core/docs-collab/docs-collab-persistence.ts), [`docs-collab-workspace.tsx`](../src/text-editor-core/docs-collab/docs-collab-workspace.tsx), [`docs-drive-operations.ts`](../src/lib/offline/docs/docs-drive-operations.ts), [`docs-collab-text-files.ts`](../src/docs-core/src/docs-collab-text-files.ts) |

**Contacts** is the original reference for patch-merge coalescing and field-level conflict merge. **Notes** adds entity-list bootstrap, reconnect `syncing` + toast, and cross-tab bootstrap refresh. **Docs** now uses collab-first offline persistence with Yjs + y-indexeddb for editable text files.

## Domain contract adapters

`OfflineDomainStore` and `OfflineDomainOperations` in [`core/types.ts`](../src/lib/offline/core/types.ts) are **TypeScript contracts**, not runtime validators. Wire your domain with thin adapters that `satisfies` the contract so drift is caught at compile time:

```ts
export const notesOfflineDomainStore = {
  readBootstrap: readNotesBootstrapFromCache,
  writeBootstrap: writeNotesBootstrapToCache,
  upsertEntity: upsertNoteInCache,
  removeEntity: removeNoteFromCache,
  readSyncToken,
  writeSyncToken,
} satisfies OfflineDomainStore<NotesBootstrap, Note>;

export const notesHybridDomainOperations: OfflineDomainOperations<NotesAPIOperations> =
  createHybridNotesOperations;
```

Domain contract adapters: [`contacts/contacts-domain-contract.ts`](../src/lib/offline/contacts/contacts-domain-contract.ts), [`notes/notes-domain-contract.ts`](../src/lib/offline/notes/notes-domain-contract.ts). Domain-specific helpers (outbox coalescing wrappers, token scopes, etc.) stay on your `*-offline-store.ts` module.

## Steps to add offline to a new app

### 1. Register your Dexie tables + version

Create a schema module that registers your tables as a side effect at import time, **before** the database opens. First add your domain to `OFFLINE_DOMAIN_VERSION_RANGES`, then register only version numbers inside that block. Add new indexes later by appending a higher version with an `upgrade()` callback — never edit a shipped version in place.

References: [`contacts/contacts-schema.ts`](../src/lib/offline/contacts/contacts-schema.ts) (tables at `CONTACTS_OFFLINE_VERSION.tables`, additive `updatedAt` index at `CONTACTS_OFFLINE_VERSION.updatedAtIndex`), [`notes/notes-schema.ts`](../src/lib/offline/notes/notes-schema.ts).

```ts
import { registerOfflineDomainTables } from "@/lib/offline/core/offline-db";
// 1. Claim { notes: { min: 10, max: 19 } } in offline-version-allocation.ts first.

const NOTES_OFFLINE_VERSION = { tables: 10, updatedAtIndex: 11 } as const;

registerOfflineDomainTables({
  domain: "notes",
  versions: [
    { version: NOTES_OFFLINE_VERSION.tables, stores: { notes_notes: "id, notebookId" } },
    // Additive index later: bump the version and backfill in upgrade().
    {
      version: NOTES_OFFLINE_VERSION.updatedAtIndex,
      stores: { notes_notes: "id, notebookId, updatedAt" },
      upgrade: async (tx) => {
        await tx
          .table("notes_notes")
          .toCollection()
          .modify((row) => {
            row.updatedAt ??= Date.now();
          });
      },
    },
  ],
});
```

> The registry merges each version's `stores` delta onto the running schema and composes the cumulative Dexie versions, so you only declare what changes. Import this module from your store and any other module that touches the DB so registration always runs first.

### 2. Implement the domain store

Wrap the core DB with your read/write helpers — bootstrap read/write, entity upsert/remove, sync tokens — and reuse the generic outbox helpers for queued mutations. Model after [`contacts-offline-store.ts`](../src/lib/offline/contacts-offline-store.ts) or [`notes-offline-store.ts`](../src/lib/offline/notes-offline-store.ts). Export a contract adapter (step above) that `satisfies` `OfflineDomainStore<TBootstrap, TEntity>`.

### 3. Implement the outbox flush

Drain queued mutations against the live API, mark `stateMismatch` rows for the conflict channel, record transient failures via `markOutboxError`, and return the result. Model after [`contacts-outbox-flush.ts`](../src/lib/offline/contacts-outbox-flush.ts) or [`notes-outbox-flush.ts`](../src/lib/offline/notes-outbox-flush.ts).

### 4. Implement hybrid operations + the sync runner

Expose the operations the UI calls. When offline (or on a network error), queue to the outbox and update the cache optimistically; when online, hit the live API and `flush()` the per-account runner.

**Per-account sync runner.** Keep one module-level [`ConnectivitySyncRunnerRegistry`](../src/lib/offline/core/connectivity-sync-runner.ts) and call `getOrCreate(username, flushTask)` so concurrent reconnects or UI triggers never overlap flushes for the same account:

```ts
const syncRunnerRegistry = new ConnectivitySyncRunnerRegistry<OutboxFlushResult>();

function runnerFor(username: string): ConnectivitySyncRunner<OutboxFlushResult> {
  return syncRunnerRegistry.getOrCreate(username, async () => flushNotesOutbox(username));
}
```

`ConnectivitySyncRunner` itself serializes a single flush; the registry holds one runner per username. Model after [`contacts-hybrid-operations.ts`](../src/lib/offline/contacts-hybrid-operations.ts) or [`notes-hybrid-operations.ts`](../src/lib/offline/notes-hybrid-operations.ts) and wire the factory through `OfflineDomainOperations<TOperations>` in your domain contract adapter.

**Cross-tab sync (Dexie domains).** After flush, reconnect, or conflict resolve, notify other tabs so they re-read the cache. Notes uses [`notifyNotesBootstrapUpdated`](../src/lib/offline/notes-bootstrap-sync.ts).

### 5. Wire the UI

- **Bootstrap:** call [`useHybridBootstrap`](../src/lib/offline/core/use-hybrid-bootstrap.ts) with `load` (live) + `readCache` (offline). See [`use-notes-api.ts`](../src/notes-core/src/use-notes-api.ts) and [`use-docs-api.ts`](../src/docs-core/src/use-docs-api.ts).
- **Reconnect flush:** use [`useOnReconnect`](../src/hooks/use-connectivity.ts) to flush and re-read the cache; bump a `syncRevision` counter so pending/failed hooks refresh (Notes and Docs pattern).
- **Sync toast:** show a "Changes synced" toast when reconnect flush completes (Notes: [`notes-app.tsx`](../src/notes-core/src/notes-app.tsx); Docs: [`docs-app.tsx`](../src/docs-core/src/docs-app.tsx)).
- **Conflicts:** create one `createSyncConflictChannel<string>()` instance; report from flush, set the listener from your screen, and resolve in a modal. Contacts: field-level merge via [`contacts-conflict-dialog.tsx`](../src/contacts-core/src/contacts-conflict-dialog.tsx). Notes/Docs: binary Keep mine / Use server via [`notes-conflict-resolution.ts`](../src/lib/offline/notes-conflict-resolution.ts) / [`docs-conflict-dialog.tsx`](../src/docs-core/src/docs-conflict-dialog.tsx).
- **Pending badge:** poll your "pending" selector and render a dot. See [`use-contacts-pending-sync.ts`](../src/contacts-core/src/use-contacts-pending-sync.ts), [`use-notes-pending-sync.ts`](../src/notes-core/src/use-notes-pending-sync.ts).
- **Retry callout:** count failed (non-conflict) outbox rows with `isRetryableOutboxRow` and offer a Retry that flushes. See [`use-contacts-failed-sync.ts`](../src/contacts-core/src/use-contacts-failed-sync.ts), [`use-notes-failed-sync.ts`](../src/notes-core/src/use-notes-failed-sync.ts).

### 6. Mount nothing extra for the shell indicator

The shell already renders [`OfflineStatusIndicator`](../src/lib/offline/core/offline-status-indicator.tsx). It reads `useConnectivity()` and shows automatically when offline — no per-app wiring needed.

## Outbox coalescing

When the user edits the same entity several times while offline, queue **one** outbox row instead of many. The core helper [`enqueueCoalescedOutboxUpdate`](../src/lib/offline/core/outbox-coalescing.ts) finds an existing pending `update` row for the same domain + entity, merges patches via your `mergePatches` callback, and preserves the original `ifInState`. If no row exists, it enqueues a new mutation.

Wrap it in a domain-specific function on your offline store. Contacts example — [`enqueueCoalescedContactUpdate`](../src/lib/offline/contacts-offline-store.ts) passes `coalesceContactPatches` as `mergePatches` and domain payload builders.

## Patch merge (optimistic cache vs outbox)

Domains with partial updates need **two** merge functions:

1. **`apply*Patch`** — merge a patch into the cached entity for the optimistic UI. `null` in sparse maps means "delete this key" (resolved view).
2. **`coalesce*Patches`** — merge two pending patches for the outbox. `null` entries are **kept** so the flush payload still tells the server to delete the id.

Contacts implements this pattern in [`contacts/contacts-patch-merge.ts`](../src/lib/offline/contacts/contacts-patch-merge.ts): `applyContactPatch` for cache updates, `coalesceContactPatches` for `enqueueCoalescedOutboxUpdate`. Notes follows the same shape for note fields.

## Testing multi-domain isolation

Core tests prove that contacts, notes, and docs share one Dexie database without table or outbox collisions:

- **Notes fixture:** [`__tests__/fixtures/notes-offline-fixture.ts`](../src/lib/offline/__tests__/fixtures/notes-offline-fixture.ts) — re-exports the production [`notes/notes-schema.ts`](../src/lib/offline/notes/notes-schema.ts) types and version constants (no duplicate registration).
- **Multi-domain test:** [`core/__tests__/offline-db-multi-domain.test.ts`](../src/lib/offline/core/__tests__/offline-db-multi-domain.test.ts) — opens a DB with core + contacts + notes tables and asserts isolated writes and composed upgrades.

Import fixtures and production schema modules only from tests — not from app runtime.

## Account session

Persist the username per domain so the cache can be found while offline:

```ts
import {
  rememberOfflineUsername,
  resolveOfflineUsername,
} from "@/lib/offline/core/offline-account";

rememberOfflineUsername("notes", username);
const username = resolveOfflineUsername("notes", session?.user.username);
```

Contacts keeps a thin wrapper ([`offline-session.ts`](../src/lib/offline/offline-session.ts)) for back-compat; new apps can call the core helpers directly.

## Definition of "ready to ship"

A new offline app is ready when it:

1. Claims a block in `OFFLINE_DOMAIN_VERSION_RANGES` and registers tables via `registerOfflineDomainTables` (enforced at registration — out-of-range or duplicate versions throw).
2. Implements store / flush / hybrid operations following the closest reference domain (Contacts for patch-merge entities, Notes for entity-list bootstrap, Docs for file-path content).
3. Uses `satisfies OfflineDomainStore` / `OfflineDomainOperations` adapters for compile-time contract checks (not runtime-enforced).
4. Reuses core connectivity, hybrid bootstrap, `ConnectivitySyncRunnerRegistry`, outbox coalescing, the conflict channel, and the shell offline indicator — with **no cross-domain coupling**.

**Examples:** Notes (app #2) ships with bootstrap sync, reconnect UX, hook tests, and live e2e. Docs (app #3) ships editable text offline via Yjs + y-indexeddb with reconnect flush and pending-sync indicators in the collab workspace.
