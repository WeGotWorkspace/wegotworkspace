import { useCallback, useEffect, useRef } from "react";

type UseListKeyboardNavigationArgs = {
  visibleIds: string[];
  activeId: string;
  selectedIds: string[];
  setActiveId: (id: string) => void;
  setSelectionMode: (value: boolean) => void;
  setSelectedIds: (ids: string[]) => void;
  onNavigateToId?: (id: string) => void;
  itemSelector?: string;
};

export function useListKeyboardNavigation({
  visibleIds,
  activeId,
  selectedIds,
  setActiveId,
  setSelectionMode,
  setSelectedIds,
  onNavigateToId,
  itemSelector = "[data-list-item-id]",
}: UseListKeyboardNavigationArgs) {
  const keyboardAnchorIdRef = useRef<string | null>(null);
  const keyboardSelectionSideRef = useRef<"top" | "bottom" | null>(null);

  const scrollListItemIntoView = useCallback(
    (id: string) => {
      if (typeof document === "undefined") return;
      requestAnimationFrame(() => {
        const target = Array.from(document.querySelectorAll<HTMLElement>(itemSelector)).find(
          (node) => node.getAttribute("data-list-item-id") === id,
        );
        target?.scrollIntoView({ block: "nearest" });
      });
    },
    [itemSelector],
  );

  const navigateListByKeyboard = useCallback(
    (direction: -1 | 1, extendSelection: boolean) => {
      if (visibleIds.length === 0) return;
      const currentIndex = activeId ? visibleIds.indexOf(activeId) : -1;
      const fallbackIndex = direction > 0 ? 0 : visibleIds.length - 1;
      if (!extendSelection) {
        keyboardAnchorIdRef.current = null;
        keyboardSelectionSideRef.current = null;
        const baseIndex = currentIndex >= 0 ? currentIndex : fallbackIndex;
        const nextIndex = Math.min(visibleIds.length - 1, Math.max(0, baseIndex + direction));
        const nextId = visibleIds[nextIndex];
        if (!nextId) return;
        setSelectionMode(false);
        setSelectedIds([nextId]);
        setActiveId(nextId);
        scrollListItemIntoView(nextId);
        onNavigateToId?.(nextId);
        return;
      }

      const anchorId =
        keyboardAnchorIdRef.current && visibleIds.includes(keyboardAnchorIdRef.current)
          ? keyboardAnchorIdRef.current
          : activeId && visibleIds.includes(activeId)
            ? activeId
            : (selectedIds.find((id) => visibleIds.includes(id)) ?? visibleIds[fallbackIndex]);
      if (!anchorId) return;
      keyboardAnchorIdRef.current = anchorId;
      const anchorIndex = visibleIds.indexOf(anchorId);
      if (anchorIndex < 0) return;

      const selectedIndexes = selectedIds
        .map((id) => visibleIds.indexOf(id))
        .filter((idx) => idx >= 0)
        .sort((a, b) => a - b);
      const minSelected = selectedIndexes[0] ?? anchorIndex;
      const maxSelected = selectedIndexes[selectedIndexes.length - 1] ?? anchorIndex;

      if (!keyboardSelectionSideRef.current) {
        const probeBase = currentIndex >= 0 ? currentIndex : anchorIndex;
        const probeIndex = Math.min(visibleIds.length - 1, Math.max(0, probeBase + direction));
        if (probeIndex < anchorIndex) keyboardSelectionSideRef.current = "top";
        else if (probeIndex > anchorIndex) keyboardSelectionSideRef.current = "bottom";
        else keyboardSelectionSideRef.current = direction < 0 ? "top" : "bottom";
      }
      const side = keyboardSelectionSideRef.current;
      if (!side) return;

      const currentEdgeIndex = side === "top" ? minSelected : maxSelected;
      const steppedEdgeIndex = Math.min(
        visibleIds.length - 1,
        Math.max(0, currentEdgeIndex + direction),
      );
      const nextEdgeIndex =
        side === "top"
          ? Math.min(steppedEdgeIndex, anchorIndex)
          : Math.max(steppedEdgeIndex, anchorIndex);

      const start = Math.min(anchorIndex, nextEdgeIndex);
      const end = Math.max(anchorIndex, nextEdgeIndex);
      const nextSelection = visibleIds.slice(start, end + 1);
      const nextId = visibleIds[nextEdgeIndex];
      if (!nextId) return;

      setSelectionMode(true);
      setSelectedIds(nextSelection);
      setActiveId(nextId);
      scrollListItemIntoView(nextId);
      onNavigateToId?.(nextId);
    },
    [
      visibleIds,
      activeId,
      selectedIds,
      setSelectionMode,
      setSelectedIds,
      setActiveId,
      scrollListItemIntoView,
      onNavigateToId,
    ],
  );

  useEffect(() => {
    if (selectedIds.length <= 1) {
      keyboardSelectionSideRef.current = null;
      keyboardAnchorIdRef.current = selectedIds[0] ?? null;
    }
  }, [selectedIds]);

  return { navigateListByKeyboard };
}
