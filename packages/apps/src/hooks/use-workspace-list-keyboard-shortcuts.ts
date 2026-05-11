import { useEffect, type RefObject } from "react";

export type UseWorkspaceListKeyboardShortcutsOptions = {
  searchInputRef: RefObject<HTMLInputElement | null>;
  selectedCount: number;
  onRequestDeleteSelection: () => void;
  onNavigateList?: (direction: -1 | 1, extendSelection: boolean) => void;
  onUndoQueuedAction?: () => boolean;
};

/**
 * Focus list search (⌘/Ctrl+K or /) and request delete for the current selection
 * when Backspace/Delete is pressed outside editable fields.
 */
export function useWorkspaceListKeyboardShortcuts({
  searchInputRef,
  selectedCount,
  onRequestDeleteSelection,
  onNavigateList,
  onUndoQueuedAction,
}: UseWorkspaceListKeyboardShortcutsOptions) {
  useEffect(() => {
    const isMac =
      typeof navigator !== "undefined" && /Mac|iPhone|iPad|iPod/.test(navigator.platform);
    let spaceHeld = false;
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const inField =
        !!target && (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName));

      if ((e.key === "k" && (e.metaKey || e.ctrlKey)) || (!inField && e.key === "/")) {
        e.preventDefault();
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
        return;
      }

      if (inField) return;
      const keyLower = e.key.toLowerCase();
      const undoPressed =
        keyLower === "z" &&
        !e.shiftKey &&
        !e.altKey &&
        ((isMac && e.metaKey) || (!isMac && e.ctrlKey));
      if (undoPressed && onUndoQueuedAction) {
        const handled = onUndoQueuedAction();
        if (handled) e.preventDefault();
        return;
      }
      if (e.code === "Space") {
        spaceHeld = true;
      }
      if ((e.key === "ArrowDown" || e.key === "ArrowUp") && onNavigateList) {
        e.preventDefault();
        const hasModifier = e.shiftKey || e.metaKey || e.ctrlKey || e.altKey;
        const extendSelection = hasModifier || spaceHeld;
        onNavigateList(e.key === "ArrowDown" ? 1 : -1, extendSelection);
        return;
      }
      const macDelete = isMac && (e.key === "Backspace" || (e.metaKey && e.key === "Backspace"));
      const winDelete = !isMac && e.key === "Delete";
      if ((macDelete || winDelete) && selectedCount > 0) {
        e.preventDefault();
        onRequestDeleteSelection();
      }
    };
    const keyupHandler = (e: KeyboardEvent) => {
      if (e.code === "Space") spaceHeld = false;
    };
    window.addEventListener("keydown", handler);
    window.addEventListener("keyup", keyupHandler);
    return () => {
      window.removeEventListener("keydown", handler);
      window.removeEventListener("keyup", keyupHandler);
    };
  }, [searchInputRef, selectedCount, onRequestDeleteSelection, onNavigateList, onUndoQueuedAction]);
}
