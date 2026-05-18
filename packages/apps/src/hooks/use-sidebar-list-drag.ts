import { useCallback, useRef, useState } from "react";

export type ListDropZoneProps = {
  isDropTarget: boolean;
  onDragEnter: (e: React.DragEvent) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
};

/**
 * Desktop list → sidebar / folder drop: tracks which items are being dragged (respecting
 * multi-select) and highlights one drop target. Uses a ref for the dragged id set so `drop`
 * always sees the latest payload.
 */
export function useSidebarListDrag(selectedIds: string[]) {
  const [draggingIds, setDraggingIds] = useState<string[] | null>(null);
  const [dropTargetKey, setDropTargetKey] = useState<string | null>(null);
  const draggingRef = useRef<string[] | null>(null);

  const beginDrag = useCallback(
    (itemId: string, e?: React.DragEvent) => {
      const ids =
        selectedIds.includes(itemId) && selectedIds.length > 1 ? selectedIds : [itemId];
      draggingRef.current = ids;
      setDraggingIds(ids);
      if (e?.dataTransfer) {
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData("text/plain", itemId);
      }
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
      onDragStart: (e: React.DragEvent) => beginDrag(itemId, e),
      onDragEnd: endDrag,
    }),
    [beginDrag, endDrag],
  );

  const dropZoneProps = useCallback(
    (targetKey: string, onCommit: (ids: string[]) => void): ListDropZoneProps => {
      const highlight = (e: React.DragEvent) => {
        if (!draggingRef.current?.length) return;
        e.preventDefault();
        e.stopPropagation();
        if (e.dataTransfer) e.dataTransfer.dropEffect = "move";
        setDropTargetKey(targetKey);
      };

      return {
        isDropTarget: dropTargetKey === targetKey,
        onDragEnter: highlight,
        onDragOver: highlight,
        onDragLeave: (e: React.DragEvent) => {
          const related = e.relatedTarget as Node | null;
          if (related && e.currentTarget.contains(related)) return;
          setDropTargetKey((current) => (current === targetKey ? null : current));
        },
        onDrop: (e: React.DragEvent) => {
          e.preventDefault();
          e.stopPropagation();
          const ids = draggingRef.current;
          if (!ids?.length) return;
          onCommit(ids);
          endDrag();
        },
      };
    },
    [dropTargetKey, endDrag],
  );

  const sidebarDropZoneProps = dropZoneProps;

  return { isItemDragging, itemDragHandlers, sidebarDropZoneProps, dropZoneProps };
}
