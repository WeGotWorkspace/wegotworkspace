import { offlineAccountKeyFromUsername, offlineDbForAccount } from "@/lib/offline/core/offline-db";

/** Read a value from the generic `meta` key/value table. */
export async function readMeta(username: string, key: string): Promise<string | null> {
  const db = offlineDbForAccount(offlineAccountKeyFromUsername(username));
  const row = await db.meta.get(key);
  return row?.value ?? null;
}

/** Write a value to the generic `meta` key/value table. */
export async function writeMeta(username: string, key: string, value: string): Promise<void> {
  const db = offlineDbForAccount(offlineAccountKeyFromUsername(username));
  await db.meta.put({ key, value });
}
