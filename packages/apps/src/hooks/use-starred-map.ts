import { useCallback, useRef, useState } from "react";

import { batchToggleStarredEntries, toggleStarredEntry } from "@/lib/collection/starred-map";

/**
 * Local starred flags keyed by item id. Toggle/batch operations return enough
 * information for callers to run toasts or other side effects (action-agnostic).
 */
export function useStarredMap(initialState: Record<string, boolean> = {}) {
  const [starred, setStarred] = useState<Record<string, boolean>>(initialState);
  const starredRef = useRef(starred);
  starredRef.current = starred;

  const toggleStar = useCallback((id: string): boolean => {
    const { next, nowStarred } = toggleStarredEntry(starredRef.current, id);
    starredRef.current = next;
    setStarred(next);
    return nowStarred;
  }, []);

  const batchToggleStarForIds = useCallback((ids: string[]) => {
    if (ids.length === 0) return null;
    const { next, allWereStarred } = batchToggleStarredEntries(starredRef.current, ids);
    starredRef.current = next;
    setStarred(next);
    return { allWereStarred, count: ids.length };
  }, []);

  return { starred, setStarred, toggleStar, batchToggleStarForIds };
}
