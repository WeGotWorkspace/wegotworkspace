import type { EntityTable, Transaction } from "dexie";
import {
  registerOfflineDomainTables,
  type WgwOfflineDatabase,
} from "@/lib/offline/core/offline-db";
import { TASKS_OFFLINE_VERSION } from "@/lib/offline/core/offline-version-allocation";

export type OfflineTaskListRow = {
  id: string;
  data: string;
};

export type OfflineTaskRow = {
  id: string;
  taskListId: string;
  data: string;
  pendingSync: boolean;
  /** Last local write time (epoch ms). Indexed at schema v41 for recency queries. */
  updatedAt: number;
};

export const TASKS_DOMAIN = "tasks";

registerOfflineDomainTables({
  domain: TASKS_DOMAIN,
  versions: [
    {
      version: TASKS_OFFLINE_VERSION.tables,
      stores: {
        tasks_task_lists: "id",
        tasks_items: "id, taskListId, pendingSync",
      },
    },
    {
      version: TASKS_OFFLINE_VERSION.updatedAtIndex,
      stores: {
        tasks_items: "id, taskListId, pendingSync, updatedAt",
      },
      upgrade: async (tx: Transaction) => {
        const now = Date.now();
        await tx
          .table<OfflineTaskRow>("tasks_items")
          .toCollection()
          .modify((row) => {
            if (typeof row.updatedAt !== "number") {
              row.updatedAt = now;
            }
          });
      },
    },
  ],
});

export function tasksItemsTable(db: WgwOfflineDatabase): EntityTable<OfflineTaskRow, "id"> {
  return db.table<OfflineTaskRow, string>("tasks_items") as EntityTable<OfflineTaskRow, "id">;
}

export function tasksListsTable(db: WgwOfflineDatabase): EntityTable<OfflineTaskListRow, "id"> {
  return db.table<OfflineTaskListRow, string>("tasks_task_lists") as EntityTable<
    OfflineTaskListRow,
    "id"
  >;
}
