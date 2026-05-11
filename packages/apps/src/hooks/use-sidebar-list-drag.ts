import { useCallback, useRef, useState } from "react";

/**
 * Desktop list → sidebar drop: tracks which items are being dragged (respecting
 * multi-select) and highlights one sidebar target. Uses a ref for the dragged id
 * set so `drop` always sees the latest payload.
 */
export function useSidebarListDrag(selectedIds: string[]) {
  const [draggingIds, setDraggingIds] = useState<string[] | null>(null);
  const [dropTargetKey, setDropTargetKey] = useState<string | null>(null);
  const draggingRef = useRef<string[] | null>(null);

  const beginDrag = useCallback(
    (itemId: string) => {
      const ids =
        selectedIds.includes(itemId) && selectedIds.length > 1 ? selectedIds : [itemId];
      draggingRef.current = ids;
      setDraggingIds(ids);
    },
    [selectedIds],
  );

  const endDrag = useCallback(() => {
    draggingRef.current = null;
    setDraggingIds(null);
    setDropTargetKey(null);
  }, []);

  const isItemDragging = useCallback(
    (id: string) => draggingIds?.includes(id) ?? false,
    [draggingIds],
  );

  const itemDragHandlers = useCallback(
    (itemId: string) => ({
      onDragStart: () => beginDrag(itemId),
      onDragEnd: endDrag,
    }),
    [beginDrag, endDrag],
  );

  const sidebarDropZoneProps = useCallback(
    (targetKey: string, onCommit: (ids: string[]) => void) => ({
      isDropTarget: dropTargetKey === targetKey,
      onDragOver: (e: React.DragEvent) => {
        if (draggingRef.current) {
          e.preventDefault();
          setDropTargetKey(targetKey);
        }
      },
      onDragLeave: () => setDropTargetKey((t) => (t === targetKey ? null : t)),
      onDrop: (e: React.DragEvent) => {
        e.preventDefault();
        const ids = draggingRef.current;
        if (!ids?.length) return;
        onCommit(ids);
        endDrag();
      },
    }),
    [dropTargetKey, endDrag],
  );

  return { isItemDragging, itemDragHandlers, sidebarDropZoneProps };
}
