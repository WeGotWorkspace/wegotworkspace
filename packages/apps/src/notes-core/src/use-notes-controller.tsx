import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { MouseEvent as ReactMouseEvent } from "react";
import {
  Archive,
  ArchiveRestore,
  BookOpen,
  Check,
  Plus,
  Star,
  StarOff,
  Tag,
  Trash2,
} from "lucide-react";
import { useAppToast } from "@/hooks/use-app-toast";
import { useConfirmDialog } from "@/hooks/use-confirm-dialog";
import { useIsTouch } from "@/hooks/use-is-touch";
import { useSelectionResetOnKeyChange } from "@/hooks/use-selection-reset-on-key-change";
import { useStarredMap } from "@/hooks/use-starred-map";
import {
  useWorkspaceListController,
  useWorkspaceSelectionPresentation,
} from "@/hooks/use-workspace-list-controller";
import { useWorkspaceListKeyboardShortcuts } from "@/hooks/use-workspace-list-keyboard-shortcuts";
import type { Note } from "@/lib/models/note";
import type { WorkspaceAppHandle } from "@/workspace-app/src/workspace-app";
import { mergeNotesLabels, type NotesUILabels } from "./notes-labels";
import { useNotesBatchActions } from "./use-notes-batch-actions";
import type { NotesAPIOperations, NotesUIData } from "./notes-types";

type UseNotesControllerArgs = {
  data: NotesUIData;
  labels?: Partial<NotesUILabels>;
  listLoading?: boolean;
  operations?: NotesAPIOperations;
};

const WRITE_QUEUE_DELAY_MS = 2500;

function persistBestEffort(promise: Promise<unknown>) {
  promise.catch(() => {});
}

function computeWordCount(body: string[]): number {
  return body.join(" ").trim().split(/\s+/).filter(Boolean).length;
}

function computeExcerpt(body: string[]): string {
  const text = body.join(" ").trim();
  if (text.length <= 180) return text;
  return `${text.slice(0, 179)}…`;
}

function normalizeTag(value: string): string {
  return value.trim();
}

export function useNotesController({
  data,
  labels,
  listLoading = false,
  operations,
}: UseNotesControllerArgs) {
  const L = useMemo(() => mergeNotesLabels(labels), [labels]);
  const [notes, setNotes] = useState<Note[]>(() => data.notes);
  const [activeId, setActiveId] = useState<string>(() => data.notes[0]?.id ?? "");
  const [view, setView] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const workspaceLayoutRef = useRef<WorkspaceAppHandle>(null);
  const autoSaveToastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [moveDialog, setMoveDialog] = useState<{ ids: string[] } | null>(null);
  const [editDialog, setEditDialog] = useState<null | { kind: "notebook" | "tag"; name: string }>(
    null,
  );
  const [deleteDialog, setDeleteDialog] = useState<null | {
    kind: "notebook" | "tag";
    name: string;
  }>(null);
  const [tagDialog, setTagDialog] = useState<null | { noteId: string }>(null);

  const initialStarred = useMemo(() => {
    const map: Record<string, boolean> = {};
    for (const note of data.notes) {
      if (note.starred) map[note.id] = true;
    }
    return map;
  }, [data.notes]);
  const {
    starred,
    setStarred,
    toggleStar: applyStarToggle,
    batchToggleStarForIds,
  } = useStarredMap(initialStarred);
  const [archived, setArchived] = useState<Record<string, boolean>>(() => {
    const map: Record<string, boolean> = {};
    for (const note of data.notes) {
      if (note.archived) map[note.id] = true;
    }
    return map;
  });

  const { show, showError } = useAppToast();
  const { confirmDialog, requestConfirm } = useConfirmDialog();
  const isTouch = useIsTouch();
  const showMutationError = useCallback(
    (fallback = "Could not sync this change. Please try again.") => showError(fallback),
    [showError],
  );
  const queueAutoSaveToast = useCallback(() => {
    if (autoSaveToastTimerRef.current) {
      clearTimeout(autoSaveToastTimerRef.current);
    }
    autoSaveToastTimerRef.current = setTimeout(() => {
      show("Saved", { icon: <Check className="size-4" /> });
      autoSaveToastTimerRef.current = null;
    }, 700);
  }, [show]);

  useEffect(
    () => () => {
      if (autoSaveToastTimerRef.current) {
        clearTimeout(autoSaveToastTimerRef.current);
      }
    },
    [],
  );

  const notebooks = useMemo(
    () => [...new Set(notes.map((note) => note.notebook).filter((name) => name.trim().length > 0))],
    [notes],
  );
  const tags = useMemo(
    () => [
      ...new Set(
        notes.flatMap((note) => note.tags.map((tag) => normalizeTag(tag))).filter(Boolean),
      ),
    ],
    [notes],
  );

  useEffect(() => {
    const next: Record<string, boolean> = {};
    for (const note of notes) {
      if (note.starred) next[note.id] = true;
    }
    setStarred(next);
  }, [notes, setStarred]);

  const visibleNotes = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return notes.filter((note) => {
      let inView = true;
      if (view === "all") inView = !archived[note.id];
      else if (view === "starred") inView = !!starred[note.id] && !archived[note.id];
      else if (view === "archive") inView = !!archived[note.id];
      else if (view.startsWith("nb:")) {
        const target = view.slice(3);
        inView =
          (note.notebook === target || note.notebook.toLowerCase() === target.toLowerCase()) &&
          !archived[note.id];
      } else if (view.startsWith("tag:")) {
        inView = note.tags.includes(view.slice(4)) && !archived[note.id];
      }
      if (!inView) return false;
      if (!q) return true;
      const haystack =
        `${note.title} ${note.excerpt} ${note.body.join(" ")} ${note.notebook} ${note.tags.join(" ")}`.toLowerCase();
      return haystack.includes(q);
    });
  }, [archived, notes, searchQuery, starred, view]);

  const viewLabel = useMemo(() => {
    if (view === "all") return L.sidebarAllItems;
    if (view === "starred") return L.sidebarStarred;
    if (view === "archive") return L.sidebarArchive;
    if (view.startsWith("nb:")) return view.slice(3);
    if (view.startsWith("tag:")) return L.tagViewTitle(view.slice(4));
    return L.fallbackViewTitle;
  }, [L, view]);

  const {
    selectedIds,
    setSelectedIds,
    selectionMode,
    setSelectionMode,
    handleSelect,
    enterSelectionFor,
    exitSelection,
    selectSingle,
    isItemDragging,
    itemDragHandlers,
    sidebarDropZoneProps,
    beginOptimisticUpdate,
    queueMutation,
    undoLatest,
    navigateListByKeyboard,
  } = useWorkspaceListController<Note>({
    items: notes,
    setItems: setNotes,
    visibleIds: visibleNotes.map((n) => n.id),
    activeId,
    setActiveId,
    initialId: data.notes[0]?.id,
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

  const active = notes.length > 0 ? (notes.find((n) => n.id === activeId) ?? notes[0]) : undefined;

  const updateAndPersistNote = useCallback(
    (noteId: string, updater: (note: Note) => Note, options?: { autoSaveToast?: boolean }) => {
      let updated: Note | undefined;
      setNotes((prev) =>
        prev.map((note) => {
          if (note.id !== noteId) return note;
          updated = updater(note);
          return updated;
        }),
      );
      if (updated && operations) {
        const request = operations.upsertNote(updated);
        if (options?.autoSaveToast) {
          persistBestEffort(request.then(() => queueAutoSaveToast()));
          return;
        }
        persistBestEffort(request);
      }
    },
    [operations, queueAutoSaveToast],
  );

  const toggleStar = useCallback(
    (id: string) => {
      const current = notes.find((note) => note.id === id);
      if (!current) return;
      const beforeStarred = !!starred[id];
      const nowStarred = applyStarToggle(id);
      setNotes((prev) =>
        prev.map((note) => (note.id === id ? { ...note, starred: nowStarred } : note)),
      );
      show(nowStarred ? "Starred" : "Unstarred", {
        icon: nowStarred ? (
          <Star className="size-4" fill="currentColor" />
        ) : (
          <StarOff className="size-4" />
        ),
      });
      if (!operations) return;
      const updated = { ...current, starred: nowStarred };
      queueMutation({
        key: `notes:star:${id}`,
        toastMessage: nowStarred ? "Starred" : "Unstarred",
        execute: () => operations.upsertNote(updated).then(() => {}),
        undo: () => {
          applyStarToggle(id);
          setNotes((prev) =>
            prev.map((note) => (note.id === id ? { ...note, starred: beforeStarred } : note)),
          );
        },
        onError: () => {
          applyStarToggle(id);
          setNotes((prev) =>
            prev.map((note) => (note.id === id ? { ...note, starred: beforeStarred } : note)),
          );
        },
        undoToastMessage: "Star change undone.",
      });
    },
    [applyStarToggle, notes, operations, queueMutation, show, starred],
  );

  const toggleArchive = useCallback(
    (id: string) => {
      const row = notes.find((note) => note.id === id);
      if (!row) return;
      let nextArchived = false;
      const beforeArchived = !!archived[id];
      setArchived((state) => {
        nextArchived = !state[id];
        return { ...state, [id]: nextArchived };
      });
      setNotes((prev) =>
        prev.map((note) => (note.id === id ? { ...note, archived: nextArchived } : note)),
      );
      show(nextArchived ? "Archived" : "Unarchived", {
        icon: nextArchived ? <Archive className="size-4" /> : <ArchiveRestore className="size-4" />,
      });
      if (!operations) return;
      queueMutation({
        key: `notes:archive:${id}`,
        toastMessage: nextArchived ? "Archived" : "Unarchived",
        execute: () =>
          (nextArchived ? operations.archiveNote(id) : operations.restoreNote(id))
            .then((serverRow) => {
              setArchived((state) => ({ ...state, [id]: !!serverRow.archived }));
              setNotes((prev) => prev.map((note) => (note.id === id ? serverRow : note)));
            })
            .then(() => {}),
        undo: () => {
          setArchived((state) => ({ ...state, [id]: beforeArchived }));
          setNotes((prev) =>
            prev.map((note) => (note.id === id ? { ...row, archived: beforeArchived } : note)),
          );
        },
        onError: () => {
          setArchived((state) => ({ ...state, [id]: beforeArchived }));
          setNotes((prev) =>
            prev.map((note) => (note.id === id ? { ...row, archived: beforeArchived } : note)),
          );
        },
        undoToastMessage: "Archive change undone.",
      });
    },
    [archived, notes, operations, queueMutation, show],
  );

  const moveToNotebook = useCallback(
    (ids: string[], notebook: string) => {
      const { snapshotById, rollback } = beginOptimisticUpdate({
        ids,
        updater: (note) => ({ ...note, notebook }),
      });
      show(`Moved ${ids.length} item${ids.length === 1 ? "" : "s"} to “${notebook}”`, {
        icon: <BookOpen className="size-4" />,
      });
      if (!operations) return;
      const updatedRows = notes
        .filter((note) => ids.includes(note.id))
        .map((note) => ({ ...note, notebook }));
      queueMutation({
        key: `notes:move:${notebook}:${ids.slice().sort().join(",")}`,
        toastMessage: `Moved ${ids.length} item${ids.length === 1 ? "" : "s"} to “${notebook}”`,
        execute: () =>
          Promise.all(updatedRows.map((row) => operations.upsertNote(row))).then(() => {}),
        undo: rollback,
        onError: rollback,
        undoToastMessage: "Move undone.",
      });
    },
    [beginOptimisticUpdate, notes, operations, queueMutation, show],
  );

  const assignTagToNotes = useCallback(
    (ids: string[], rawTag: string) => {
      const tag = normalizeTag(rawTag);
      if (!tag) return;
      const before = notes.filter((note) => ids.includes(note.id));
      setNotes((prev) =>
        prev.map((note) =>
          ids.includes(note.id) && !note.tags.includes(tag)
            ? { ...note, tags: [...note.tags, tag] }
            : note,
        ),
      );
      show(`Tagged ${ids.length} item${ids.length === 1 ? "" : "s"} with ${tag}`, {
        icon: <Tag className="size-4" />,
      });
      if (!operations) return;
      const updatedRows = before.map((note) =>
        note.tags.includes(tag) ? note : { ...note, tags: [...note.tags, tag] },
      );
      queueMutation({
        key: `notes:tag:${tag}:${ids.slice().sort().join(",")}`,
        toastMessage: `Tagged ${ids.length} item${ids.length === 1 ? "" : "s"} with ${tag}`,
        execute: () =>
          Promise.all(updatedRows.map((row) => operations.upsertNote(row))).then(() => {}),
        undo: () => {
          setNotes((prev) =>
            prev.map((note) => {
              const snapshot = before.find((row) => row.id === note.id);
              return snapshot ? snapshot : note;
            }),
          );
        },
        onError: () => {
          setNotes((prev) =>
            prev.map((note) => {
              const snapshot = before.find((row) => row.id === note.id);
              return snapshot ? snapshot : note;
            }),
          );
        },
        undoToastMessage: "Tag assignment undone.",
      });
    },
    [notes, operations, queueMutation, show],
  );

  const renameNotebook = useCallback(
    (oldName: string, newName: string) => {
      const value = newName.trim();
      if (!value || (value !== oldName && notebooks.includes(value))) return;
      setNotes((prev) =>
        prev.map((note) => (note.notebook === oldName ? { ...note, notebook: value } : note)),
      );
      if (view === `nb:${oldName}`) setView(`nb:${value}`);
      if (operations) persistBestEffort(operations.renameNotebook(oldName, value));
      show(`Renamed to “${value}”`, { icon: <Tag className="size-4" /> });
    },
    [notebooks, operations, show, view],
  );

  const renameTag = useCallback(
    (oldName: string, newName: string) => {
      const value = normalizeTag(newName);
      if (!value || (value !== oldName && tags.includes(value))) return;
      const changedRows = notes
        .filter((note) => note.tags.includes(oldName))
        .map((note) => ({
          ...note,
          tags: note.tags.map((tag) => (tag === oldName ? value : tag)),
        }));
      setNotes((prev) =>
        prev.map((note) => ({
          ...note,
          tags: note.tags.map((tag) => (tag === oldName ? value : tag)),
        })),
      );
      if (view === `tag:${oldName}`) setView(`tag:${value}`);
      if (operations) {
        changedRows.forEach((note) => persistBestEffort(operations.upsertNote(note)));
      }
      show(`Renamed to ${value}`, { icon: <Tag className="size-4" /> });
    },
    [notes, operations, show, tags, view],
  );

  const deleteNotebook = useCallback(
    (name: string, opts: { transferTo?: string; archive?: boolean }) => {
      if (opts.transferTo) {
        const target = opts.transferTo;
        setNotes((prev) =>
          prev.map((note) => (note.notebook === name ? { ...note, notebook: target } : note)),
        );
        if (operations) {
          persistBestEffort(operations.deleteNotebook(name, { kind: "move", target }));
        }
      } else if (opts.archive) {
        const fallback = notebooks.find((notebook) => notebook !== name) ?? "";
        setArchived((state) => {
          const next = { ...state };
          notes.forEach((note) => {
            if (note.notebook === name) next[note.id] = true;
          });
          return next;
        });
        if (fallback) {
          setNotes((prev) =>
            prev.map((note) => (note.notebook === name ? { ...note, notebook: fallback } : note)),
          );
        }
        if (operations) {
          persistBestEffort(operations.deleteNotebook(name, { kind: "archive" }));
        }
      } else if (operations) {
        persistBestEffort(operations.deleteNotebook(name, { kind: "purge" }));
      }
      if (view === `nb:${name}`) setView("all");
      show(`Notebook “${name}” deleted`, { icon: <Trash2 className="size-4" /> });
    },
    [notebooks, notes, operations, show, view],
  );

  const deleteTag = useCallback(
    (name: string) => {
      const changedRows = notes
        .filter((note) => note.tags.includes(name))
        .map((note) => ({
          ...note,
          tags: note.tags.filter((tag) => tag !== name),
        }));
      setNotes((prev) =>
        prev.map((note) => ({ ...note, tags: note.tags.filter((tag) => tag !== name) })),
      );
      if (view === `tag:${name}`) setView("all");
      if (operations) {
        changedRows.forEach((note) => persistBestEffort(operations.upsertNote(note)));
      }
      show(`Tag ${name} deleted`, { icon: <Trash2 className="size-4" /> });
    },
    [notes, operations, show, view],
  );

  const toggleNoteTag = useCallback(
    (noteId: string, rawTag: string) => {
      const tag = normalizeTag(rawTag);
      if (!tag) return;
      let added = false;
      updateAndPersistNote(noteId, (note) => {
        const has = note.tags.includes(tag);
        added = !has;
        return {
          ...note,
          tags: has ? note.tags.filter((current) => current !== tag) : [...note.tags, tag],
        };
      });
      show(added ? `Added ${tag}` : `Removed ${tag}`, { icon: <Tag className="size-4" /> });
    },
    [show, updateAndPersistNote],
  );

  const updateNote = useCallback(
    (id: string, patch: Partial<Note>) => {
      updateAndPersistNote(
        id,
        (note) => {
          const body = patch.body ?? note.body;
          return {
            ...note,
            ...patch,
            excerpt: patch.excerpt ?? computeExcerpt(body),
            wordCount: patch.wordCount ?? computeWordCount(body),
          };
        },
        { autoSaveToast: true },
      );
    },
    [updateAndPersistNote],
  );

  const canCreateNote = !(view === "starred" || view === "archive");
  const createNote = useCallback(() => {
    if (!canCreateNote) return;
    const targetNotebook = view.startsWith("nb:") ? view.slice(3) : (notebooks[0] ?? "Drafts");
    const targetTag = view.startsWith("tag:") ? view.slice(4) : null;
    const id = `n-${Date.now()}`;
    const date = new Date().toISOString();
    const note: Note = {
      id,
      category: L.newNoteCategory,
      date,
      title: "",
      excerpt: "",
      body: [""],
      notebook: targetNotebook,
      tags: targetTag ? [normalizeTag(targetTag)] : [],
      wordCount: 0,
    };
    setNotes((prev) => [note, ...prev]);
    setActiveId(id);
    selectSingle(id);
    workspaceLayoutRef.current?.openMobileDetail();
    if (operations) persistBestEffort(operations.upsertNote(note));
    show(L.toastNewNote, { icon: <Plus className="size-4" /> });
  }, [
    L.newNoteCategory,
    L.toastNewNote,
    canCreateNote,
    notebooks,
    operations,
    selectSingle,
    show,
    view,
  ]);

  const selectedNotebook = view.startsWith("nb:") ? view.slice(3) : null;
  const selectedTag = view.startsWith("tag:") ? view.slice(4) : null;
  const canEditDelete = !!(selectedNotebook || selectedTag);

  const selectView = useCallback((nextView: string) => {
    setView(nextView);
    workspaceLayoutRef.current?.closeMobileDetail();
    if (typeof window !== "undefined" && window.matchMedia("(max-width: 767px)").matches) {
      workspaceLayoutRef.current?.closeSidebar();
    }
  }, []);

  const { batchStar, batchArchive, requestDeleteSelected, openDeleteConfirm } =
    useNotesBatchActions({
      notes,
      setNotes,
      selectedIds,
      view,
      archived,
      setArchived,
      setSelectedIds,
      setSelectionMode,
      operations,
      queueMutation,
      batchToggleStarForIds,
      show,
      requestConfirm,
      deleteConfirmCopy: {
        dialogEmptyArchiveTitle: L.dialogEmptyArchiveTitle,
        dialogDeleteItemsTitle: L.dialogDeleteItemsTitle,
        dialogEmptyArchiveDescription: L.dialogEmptyArchiveDescription,
        dialogDeleteSelectedDescription: L.dialogDeleteSelectedDescription,
        dialogDeleteConfirmSuffix: L.dialogDeleteConfirmSuffix,
        dialogPermanentDeleteLeadIn: L.dialogPermanentDeleteLeadIn,
        dialogDelete: L.dialogDelete,
        dialogCancel: L.dialogCancel,
      },
    });

  const selectedRows = useMemo(
    () => notes.filter((note) => selectedIds.includes(note.id)),
    [notes, selectedIds],
  );
  const allSelectedStarred =
    selectedRows.length > 0 && selectedRows.every((note) => !!starred[note.id]);
  const allSelectedArchived =
    selectedRows.length > 0 && selectedRows.every((note) => !!archived[note.id]);

  useWorkspaceListKeyboardShortcuts({
    searchInputRef,
    selectedCount: selectedIds.length,
    onRequestDeleteSelection: requestDeleteSelected,
    onNavigateList: navigateListByKeyboard,
    onUndoQueuedAction: undoLatest,
  });

  const selectionActionButtons = useMemo(
    () => [
      {
        label: allSelectedStarred ? L.swipeUnstar : L.selectionStar,
        icon: <Star className="size-4" fill={allSelectedStarred ? "currentColor" : "none"} />,
        onClick: batchStar,
        active: allSelectedStarred,
      },
      {
        label: allSelectedArchived ? L.swipeUnarchive : L.selectionArchive,
        icon: allSelectedArchived ? (
          <ArchiveRestore className="size-4" />
        ) : (
          <Archive className="size-4" />
        ),
        onClick: batchArchive,
        active: allSelectedArchived,
      },
      {
        label: L.selectionMoveToNotebook,
        icon: <BookOpen className="size-4" />,
        onClick: () => setMoveDialog({ ids: selectedIds }),
      },
      ...(view === "archive"
        ? [
            {
              label: L.selectionDeletePermanently,
              icon: <Trash2 className="size-4" />,
              onClick: requestDeleteSelected,
            },
          ]
        : []),
    ],
    [
      allSelectedArchived,
      allSelectedStarred,
      batchArchive,
      batchStar,
      requestDeleteSelected,
      selectedIds,
      setMoveDialog,
      view,
      L.swipeUnstar,
      L.selectionStar,
      L.swipeUnarchive,
      L.selectionArchive,
      L.selectionMoveToNotebook,
      L.selectionDeletePermanently,
    ],
  );
  const { selectionBarButtons, selectionBar } = useWorkspaceSelectionPresentation({
    selectedIds,
    selectionMode,
    activeId,
    exitSelection,
    actionButtons: selectionActionButtons,
    doneLabel: L.selectionDone,
    floatingClassName: "md:hidden",
  });

  return {
    L,
    notes,
    setNotes,
    notebooks,
    tags,
    active,
    activeId,
    view,
    viewLabel,
    starred,
    archived,
    selectedIds,
    selectionMode,
    canCreateNote,
    selectedNotebook,
    selectedTag,
    canEditDelete,
    searchQuery,
    searchInputRef,
    moveDialog,
    editDialog,
    deleteDialog,
    tagDialog,
    visibleNotes,
    workspaceLayoutRef,
    isTouch,
    confirmDialog,
    listLoading,
    isItemDragging,
    itemDragHandlers,
    sidebarDropZoneProps,
    selectionBarButtons,
    selectionBar,
    handleSelect: handleSelect as (id: string, e: ReactMouseEvent) => void,
    enterSelectionFor,
    selectView,
    setSearchQuery,
    setMoveDialog,
    setEditDialog,
    setDeleteDialog,
    setTagDialog,
    moveToNotebook,
    assignTagToNotes,
    createNote,
    toggleStar,
    toggleArchive,
    requestDeleteSelected,
    openDeleteConfirm,
    renameNotebook,
    renameTag,
    deleteNotebook,
    deleteTag,
    toggleNoteTag,
    updateNote,
  };
}
