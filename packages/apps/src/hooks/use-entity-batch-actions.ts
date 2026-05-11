import { useCallback, type Dispatch, type SetStateAction } from "react";
import {
  applyUpdaterToIds,
  nextActiveIdAfterRemoving,
  restoreItemsFromSnapshot,
  snapshotItemsById,
  type IdentifiableItem,
} from "@/hooks/collection-controller-utils";

type UseEntityBatchActionsArgs<T extends IdentifiableItem> = {
  items: T[];
  setItems: Dispatch<SetStateAction<T[]>>;
  visibleIds: string[];
  activeId: string;
  setActiveId: (id: string) => void;
};

export type BeginOptimisticUpdateArgs<T extends IdentifiableItem> = {
  ids: string[];
  updater: (item: T) => T;
};

export type BeginOptimisticUpdateResult<T extends IdentifiableItem> = {
  snapshotById: Map<string, T>;
  affectedItems: T[];
  rollback: () => void;
};

export type BeginOptimisticUpdateFn<T extends IdentifiableItem> = (
  args: BeginOptimisticUpdateArgs<T>,
) => BeginOptimisticUpdateResult<T>;

export function useEntityBatchActions<T extends IdentifiableItem>({
  items,
  setItems,
  visibleIds,
  activeId,
  setActiveId,
}: UseEntityBatchActionsArgs<T>) {
  const beginOptimisticUpdate = useCallback(
    ({ ids, updater }: BeginOptimisticUpdateArgs<T>): BeginOptimisticUpdateResult<T> => {
      const snapshotById = snapshotItemsById(items, ids);
      const affectedItems = items.filter((item) => snapshotById.has(item.id));
      const nextVisibleId = nextActiveIdAfterRemoving(visibleIds, ids, activeId);
      const shouldUpdateActive = !!activeId && ids.includes(activeId);

      setItems((prev) => applyUpdaterToIds(prev, ids, updater));
      if (shouldUpdateActive) setActiveId(nextVisibleId);

      const rollback = () => {
        setItems((prev) => restoreItemsFromSnapshot(prev, snapshotById));
        if (shouldUpdateActive) setActiveId(activeId);
      };

      return { snapshotById, affectedItems, rollback };
    },
    [items, visibleIds, activeId, setItems, setActiveId],
  );

  return { beginOptimisticUpdate };
}
