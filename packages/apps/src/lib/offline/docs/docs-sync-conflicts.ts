import { createSyncConflictChannel } from "@/lib/offline/core/sync-conflicts";

const channel = createSyncConflictChannel<string>();

export type DocsSyncConflictListener = (apiPaths: string[]) => void;

export function setDocsSyncConflictListener(next: DocsSyncConflictListener | undefined): void {
  channel.setListener(next);
}

export function reportDocsSyncConflicts(apiPaths: string[]): void {
  channel.report(apiPaths);
}
