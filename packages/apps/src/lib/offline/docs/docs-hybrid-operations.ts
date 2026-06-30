import { createWgwDriveOperations } from "@/lib/api/wgw/drive";
import { parentAndName } from "@/lib/files/api-path";
import type { DriveAPIOperations, DriveUIData } from "@/drive-core/src/drive-types";
import { normalizeApiVirtualPath } from "@/drive-core/src/drive-path-utils";
import { isFetchNetworkError, readBrowserOnline } from "@/lib/offline/core/browser-online";
import {
  ConnectivitySyncRunner,
  ConnectivitySyncRunnerRegistry,
} from "@/lib/offline/core/connectivity-sync-runner";
import { enqueueOutboxMutation } from "@/lib/offline/core/outbox-store";
import {
  migrateDocsAvailabilityPath,
  normalizeDocsAvailabilityPath,
} from "@/lib/offline/docs/docs-availability-store";
import { DOCS_DOMAIN } from "@/lib/offline/docs/docs-schema";
import type { DocsOutboxPayload } from "@/lib/offline/docs/docs-outbox-flush";
import { flushDocsOutbox, type OutboxFlushResult } from "@/lib/offline/docs/docs-outbox-flush";
import { readOfflineDocsUsername } from "@/lib/offline/offline-session";
import { isDocsCollabEditablePath } from "@/docs-core/src/docs-collab-text-files";
import { migrateCollabPersistence } from "@/text-editor-core/docs-collab/docs-collab-persistence";

function rethrowUnlessOfflineQueue(error: unknown, signal?: AbortSignal): void {
  if (signal?.aborted) throw error;
  if (error instanceof DOMException && error.name === "AbortError") throw error;
  if (!isFetchNetworkError(error)) throw error;
}

const syncRunnerRegistry = new ConnectivitySyncRunnerRegistry<OutboxFlushResult>();

async function flushDocsOutboxTask(username: string): Promise<OutboxFlushResult> {
  return flushDocsOutbox(username);
}

function runnerFor(username: string): ConnectivitySyncRunner<OutboxFlushResult> {
  return syncRunnerRegistry.getOrCreate(username, async () => flushDocsOutboxTask(username));
}

export function getDocsSyncRunner(username: string): ConnectivitySyncRunner<OutboxFlushResult> {
  return runnerFor(username);
}

async function queueDocsOutbox(username: string, payload: DocsOutboxPayload): Promise<void> {
  await enqueueOutboxMutation(username, {
    id: crypto.randomUUID(),
    domain: DOCS_DOMAIN,
    op: payload.op,
    payload: JSON.stringify(payload),
  });
}

async function applyOnlineRenameSideEffects(
  username: string,
  from: string,
  destination: string,
  to: string,
): Promise<void> {
  const oldPath = normalizeDocsAvailabilityPath(from);
  const normalizedDest = normalizeApiVirtualPath(destination);
  const newPath = normalizeDocsAvailabilityPath(
    normalizedDest === "/" ? `/${to}` : `${normalizedDest}/${to}`,
  );
  if (isDocsCollabEditablePath(oldPath) && isDocsCollabEditablePath(newPath)) {
    try {
      await migrateCollabPersistence(oldPath, newPath);
    } catch (error) {
      console.warn("[docs-hybrid] collab persistence migration failed", error);
    }
  }
  await migrateDocsAvailabilityPath(username, oldPath, newPath);
}

export function createHybridDocsDriveOperations(username: string): DriveAPIOperations {
  const live = createWgwDriveOperations("/");

  return {
    ...live,
    renameItem: async (input, opts) => {
      if (readBrowserOnline()) {
        try {
          const data = await live.renameItem(input, opts);
          await applyOnlineRenameSideEffects(username, input.from, input.destination, input.to);
          return data;
        } catch (error) {
          rethrowUnlessOfflineQueue(error, opts?.signal);
        }
      }
      const payload: DocsOutboxPayload = {
        op: "rename",
        from: normalizeApiVirtualPath(input.from),
        destination: normalizeApiVirtualPath(input.destination),
        to: input.to,
      };
      await queueDocsOutbox(username, payload);
      return offlineQueuedDriveData(normalizeApiVirtualPath(input.destination));
    },
    uploadFiles: async (input, opts) => {
      if (readBrowserOnline()) {
        try {
          return await live.uploadFiles(input, opts);
        } catch (error) {
          rethrowUnlessOfflineQueue(error, opts?.signal);
        }
      }
      for (const file of input.files) {
        const apiPath = normalizeApiVirtualPath(
          input.cwd === "/" ? `/${file.name}` : `${input.cwd}/${file.name}`,
        );
        const content = await file.text();
        await queueDocsOutbox(username, { op: "create", apiPath, content });
      }
      return offlineQueuedDriveData(normalizeApiVirtualPath(input.cwd));
    },
  };
}

export async function flushDocsOutboxForAccount(
  username?: string | null,
): Promise<OutboxFlushResult | null> {
  const resolved = username ?? readOfflineDocsUsername();
  if (!resolved) return null;
  const result = await runnerFor(resolved).flush();
  return result ?? null;
}

function offlineQueuedDriveData(cwd: string): DriveUIData {
  return {
    user: { username: "", name: "", role: "user", roots: [] },
    cwd,
    directory: { location: cwd, files: [] },
    plugins: [],
  };
}

export function docsOutboxPathFromRename(from: string, destination: string, to: string): string {
  const normalizedDest = normalizeApiVirtualPath(destination);
  return normalizedDest === "/" ? `/${to}` : `${normalizedDest}/${to}`;
}

export { parentAndName };
