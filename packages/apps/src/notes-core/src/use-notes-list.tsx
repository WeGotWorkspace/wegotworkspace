import { useMemo, useState } from "react";
import type { MouseEvent as ReactMouseEvent } from "react";
import { useIsTouch } from "@/hooks/use-is-touch";
import { useSelectionResetOnKeyChange } from "@/hooks/use-selection-reset-on-key-change";
import { useWorkspaceListController } from "@/hooks/use-workspace-list-controller";
import type { Note } from "@/lib/models/note";
import { filterVisibleNotes } from "./notes-note-utils";
import type { NotesShellState } from "./use-notes-shell";

const WRITE_QUEUE_DELAY_MS = 2500;

export type UseNotesListArgs = {
  shell: NotesShellState;
};

export function useNotesList({ shell }: UseNotesListArgs) {
  const {
    notes,
    setNotes,
    view,
    searchQuery,
    searchInputRef,
    workspaceLayoutRef,
    starred,
    archived,
    showMutationError,
  } = shell;

  const [activeId, setActiveId] = useState<string>("");
  const isTouch = useIsTouch();

  const visibleNotes = useMemo(
    () => filterVisibleNotes(notes, { view, archived, starred, searchQuery }),
    [archived, notes, searchQuery, starred, view],
  );

  const {
    selectedIds,
    setSelectedIds,
    selectionMode,
    setSelectionMode,
    handleSelect,
    enterSelectionFor,
    exitSelection,
    selectSingle,
    beginOptimisticUpdate,
    isItemDragging,
    itemDragHandlers,
    sidebarDropZoneProps,
    queueMutation,
    undoLatest,
    navigateListByKeyboard,
  } = useWorkspaceListController<Note>({
    items: notes,
    setItems: setNotes,
    visibleIds: visibleNotes.map((n) => n.id),
    activeId,
    setActiveId,
    onPrimarySelect: (id) => {
      setActiveId(id);
      workspaceLayoutRef.current?.openMobileDetail();
    },
    onNavigateToId: () => workspaceLayoutRef.current?.openMobileDetail(),
    onMutationError: showMutationError,
    queueDelayMs: WRITE_QUEUE_DELAY_MS,
  });

  useSelectionResetOnKeyChange({
    resetKey: view,
    setSelectedIds,
    setSelectionMode,
  });

  const active = activeId ? notes.find((n) => n.id === activeId) : undefined;

  return {
    activeId,
    setActiveId,
    active,
    visibleNotes,
    selectedIds,
    setSelectedIds,
    selectionMode,
    setSelectionMode,
    handleSelect: handleSelect as (id: string, e: ReactMouseEvent) => void,
    enterSelectionFor,
    exitSelection,
    selectSingle,
    isTouch,
    isItemDragging,
    itemDragHandlers,
    sidebarDropZoneProps,
    queueMutation,
    undoLatest,
    navigateListByKeyboard,
    beginOptimisticUpdate,
  };
}

export type NotesListState = ReturnType<typeof useNotesList>;
