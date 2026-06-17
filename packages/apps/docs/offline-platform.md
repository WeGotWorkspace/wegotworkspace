# Offline platform — adding offline support to a new app

The generic offline platform lives under [`packages/apps/src/lib/offline/core/`](../src/lib/offline/core). It is **app-agnostic**: it owns the per-account Dexie database, a domain table/version registry, generic outbox + meta stores, connectivity detection, a serialized sync runner, the hybrid-bootstrap hook, the account-session helpers, a generic conflict channel, and the shell offline indicator.

A **domain plugin** (like contacts) registers its tables, implements a small store/flush/operations layer on top of the core, and wires the shared hooks. Contacts is the reference implementation — every step below links to its real file.

## What the core gives you

| Concern                                                                   | Module                                                                                                                             |
| ------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| Dexie factory + version/migration registry                                | [`core/offline-db.ts`](../src/lib/offline/core/offline-db.ts)                                                                      |
| Generic outbox CRUD (`enqueue`/`list`/`remove`/`markError`/`isRetryable`) | [`core/outbox-store.ts`](../src/lib/offline/core/outbox-store.ts)                                                                  |
| Key/value meta + sync tokens                                              | [`core/meta-store.ts`](../src/lib/offline/core/meta-store.ts)                                                                      |
| Online/offline detection + snapshots                                      | [`core/browser-online.ts`](../src/lib/offline/core/browser-online.ts) (via [`use-connectivity`](../src/hooks/use-connectivity.ts)) |
| Serialized flush runner                                                   | [`core/connectivity-sync-runner.ts`](../src/lib/offline/core/connectivity-sync-runner.ts)                                          |
| Cache-then-network bootstrap                                              | [`core/use-hybrid-bootstrap.ts`](../src/lib/offline/core/use-hybrid-bootstrap.ts)                                                  |
| Per-domain account session (`wgw.offline.<domain>.username`)              | [`core/offline-account.ts`](../src/lib/offline/core/offline-account.ts)                                                            |
| Generic conflict channel `createSyncConflictChannel<TId>()`               | [`core/sync-conflicts.ts`](../src/lib/offline/core/sync-conflicts.ts)                                                              |
| Shell "Offline" pill                                                      | [`core/offline-status-indicator.tsx`](../src/lib/offline/core/offline-status-indicator.tsx)                                        |
| Shared type contracts                                                     | [`core/types.ts`](../src/lib/offline/core/types.ts)                                                                                |

The core defines Dexie **version 1** = `{ meta, outbox }`. Each domain owns a **non-overlapping version block** enforced at registration time (see [`core/offline-version-allocation.ts`](../src/lib/offline/core/offline-version-allocation.ts)). Contacts uses **2–9**; reserved slots **10–19** and **20–29** are available for the next offline apps.

## Version allocation

Before registering tables, claim a version block in `OFFLINE_DOMAIN_VERSION_RANGES` inside [`offline-version-allocation.ts`](../src/lib/offline/core/offline-version-allocation.ts):

| Domain / slot | Dexie versions |
| ------------- | -------------- |
| core          | 1              |
| contacts      | 2–9            |
| app-slot-2    | 10–19          |
| app-slot-3    | 20–29          |

Rename the slot key to your domain name (e.g. `notes`) when you take it. Each version step you register must fall inside your block. Registration **throws** if a version is out of range or already claimed by another domain — two domains must never share a Dexie version number.

Define named constants for your steps (contacts uses `CONTACTS_OFFLINE_VERSION`) so migrations stay readable and stay inside the block.

## Steps to add offline to app #2

### 1. Register your Dexie tables + version

Create a schema module that registers your tables as a side effect at import time, **before** the database opens. First add your domain to `OFFLINE_DOMAIN_VERSION_RANGES`, then register only version numbers inside that block. Add new indexes later by appending a higher version with an `upgrade()` callback — never edit a shipped version in place. See [`contacts/contacts-schema.ts`](../src/lib/offline/contacts/contacts-schema.ts) (contacts adds its tables at `CONTACTS_OFFLINE_VERSION.tables` and an additive `updatedAt` index at `CONTACTS_OFFLINE_VERSION.updatedAtIndex`).

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

Wrap the core DB with your read/write helpers — bootstrap read/write, entity upsert/remove, sync tokens — and reuse the generic outbox helpers for queued mutations. Model after [`contacts-offline-store.ts`](../src/lib/offline/contacts-offline-store.ts). The shape is captured by `OfflineDomainStore<TBootstrap, TEntity>` in [`core/types.ts`](../src/lib/offline/core/types.ts).

### 3. Implement the outbox flush

Drain queued mutations against the live API, mark `stateMismatch` rows for the conflict channel, record transient failures via `markOutboxError`, and return the result. Model after [`contacts-outbox-flush.ts`](../src/lib/offline/contacts-outbox-flush.ts).

### 4. Implement hybrid operations + the sync runner

Expose the operations the UI calls. When offline (or on a network error), queue to the outbox and update the cache optimistically; when online, hit the live API and `flush()` the per-account [`ConnectivitySyncRunner`](../src/lib/offline/core/connectivity-sync-runner.ts). Model after [`contacts-hybrid-operations.ts`](../src/lib/offline/contacts-hybrid-operations.ts).

### 5. Wire the UI

- **Bootstrap:** call [`useHybridBootstrap`](../src/lib/offline/core/use-hybrid-bootstrap.ts) with `load` (live) + `readCache` (offline).
- **Reconnect flush:** use [`useOnReconnect`](../src/hooks/use-connectivity.ts) to flush and re-read the cache.
- **Conflicts:** create one `createSyncConflictChannel<string>()` instance; report from flush, set the listener from your screen, and resolve with a binary modal. See [`contacts-conflict-dialog.tsx`](../src/contacts-core/src/contacts-conflict-dialog.tsx) and [`contacts-conflict-resolution.ts`](../src/lib/offline/contacts-conflict-resolution.ts).
- **Pending badge:** poll your "pending" selector and render a dot via the `ListItem` `icons` slot, tinted with a parent-scoped token. See [`use-contacts-pending-sync.ts`](../src/contacts-core/src/use-contacts-pending-sync.ts).
- **Retry callout:** count failed (non-conflict) outbox rows with `isRetryableOutboxRow` and offer a Retry that flushes. See [`use-contacts-failed-sync.ts`](../src/contacts-core/src/use-contacts-failed-sync.ts).

### 6. Mount nothing extra for the shell indicator

The shell already renders [`OfflineStatusIndicator`](../src/lib/offline/core/offline-status-indicator.tsx). It reads `useConnectivity()` and shows automatically when offline — no per-app wiring needed.

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

## Definition of "ready for app #2"

A new app can register Dexie tables + a version, implement the domain store / flush / operations interfaces, and reuse connectivity, hybrid bootstrap, the sync runner, the conflict channel, and the shell offline indicator — with **no contacts coupling**.
