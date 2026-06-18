import type { DocsAppBootstrap } from "@/docs-core/src/docs-types";
import type { DocsDocument } from "@/docs-core/src/docs-types";
import type { DocsAPIOperations } from "@/docs-core/src/docs-types";
import { createHybridDocsOperations } from "@/lib/offline/docs/docs-hybrid-operations";
import {
  readDocsBootstrapFromCache,
  readSyncToken,
  removeEntityFromCache,
  upsertEntityInCache,
  writeDocsBootstrapToCache,
  writeSyncToken,
} from "@/lib/offline/docs/docs-offline-store";
import type { OfflineDomainOperations, OfflineDomainStore } from "@/lib/offline/core/types";

/**
 * Docs persistence wired to {@link OfflineDomainStore}. Domain-specific helpers
 * (outbox coalescing, file baselines, etc.) stay on `docs-offline-store.ts`.
 */
export const docsOfflineDomainStore = {
  readBootstrap: readDocsBootstrapFromCache,
  writeBootstrap: writeDocsBootstrapToCache,
  upsertEntity: upsertEntityInCache,
  removeEntity: removeEntityFromCache,
  readSyncToken,
  writeSyncToken,
} satisfies OfflineDomainStore<DocsAppBootstrap, DocsDocument>;

/** Docs hybrid API factory wired to {@link OfflineDomainOperations}. */
export const docsHybridDomainOperations: OfflineDomainOperations<DocsAPIOperations> =
  createHybridDocsOperations;
