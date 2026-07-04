import { readMeta, writeMeta } from "@/lib/offline/core/meta-store";

export type ProgressiveSyncProgress = {
  running: boolean;
  total: number;
  synced: number;
  failed: number;
  updatedAt: number;
};

export function emptyProgressiveSyncProgress(): ProgressiveSyncProgress {
  return {
    running: false,
    total: 0,
    synced: 0,
    failed: 0,
    updatedAt: Date.now(),
  };
}

export async function readProgressiveSyncProgress(
  username: string,
  metaKey: string,
): Promise<ProgressiveSyncProgress> {
  const raw = await readMeta(username, metaKey);
  if (!raw) return emptyProgressiveSyncProgress();
  try {
    return {
      ...emptyProgressiveSyncProgress(),
      ...(JSON.parse(raw) as Partial<ProgressiveSyncProgress>),
      updatedAt: Date.now(),
    };
  } catch {
    return emptyProgressiveSyncProgress();
  }
}

async function writeProgressiveSyncProgress(
  username: string,
  metaKey: string,
  progress: ProgressiveSyncProgress,
): Promise<void> {
  await writeMeta(username, metaKey, JSON.stringify(progress));
}

export type RunProgressiveSyncOptions<T> = {
  username: string;
  metaKey: string;
  items: readonly T[];
  syncOne: (item: T) => Promise<void>;
  concurrency?: number;
  signal?: AbortSignal;
};

/** Progressive bounded-concurrency sync with Dexie meta progress tracking. */
export async function runProgressiveSync<T>({
  username,
  metaKey,
  items,
  syncOne,
  concurrency = 4,
  signal,
}: RunProgressiveSyncOptions<T>): Promise<ProgressiveSyncProgress> {
  const progress: ProgressiveSyncProgress = {
    running: true,
    total: items.length,
    synced: 0,
    failed: 0,
    updatedAt: Date.now(),
  };
  await writeProgressiveSyncProgress(username, metaKey, progress);

  let cursor = 0;
  const next = (): T | undefined => {
    const item = items[cursor];
    cursor += 1;
    return item;
  };

  const worker = async () => {
    while (true) {
      if (signal?.aborted) return;
      const item = next();
      if (item === undefined) return;
      try {
        await syncOne(item);
        progress.synced += 1;
      } catch {
        progress.failed += 1;
      }
      progress.updatedAt = Date.now();
      await writeProgressiveSyncProgress(username, metaKey, progress);
    }
  };

  const workers = Math.min(concurrency, Math.max(items.length, 1));
  await Promise.all(Array.from({ length: workers }, () => worker()));

  progress.running = false;
  progress.updatedAt = Date.now();
  await writeProgressiveSyncProgress(username, metaKey, progress);
  return progress;
}
