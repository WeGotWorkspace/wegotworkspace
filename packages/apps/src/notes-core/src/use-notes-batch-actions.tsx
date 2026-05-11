import { useCallback, type Dispatch, type ReactNode, type SetStateAction } from "react";
import { Archive, ArchiveRestore, Star, StarOff, Trash2 } from "lucide-react";
import { runQueuedBatchAction } from "@/hooks/use-batch-actions";
import { buildPermanentDeleteDescription } from "@/lib/workspace/destructive-dialog";
import type { Note } from "@/lib/models/note";
import type { NotesAPIOperations } from "./notes-types";

type QueueMutation = (args: {
  key: string;
  toastMessage: string;
  execute: (signal: AbortSignal) => Promise<void>;
  undo: () => void;
  onError?: () => void;
  undoToastMessage?: string;
}) => void;

type NotesDeleteConfirmCopy = {
  dialogEmptyArchiveTitle: string;
  dialogDeleteItemsTitle: (count: number) => string;
  dialogEmptyArchiveDescription: (count: number) => string;
  dialogDeleteSelectedDescription: string;
  dialogDeleteConfirmSuffix: string;
  dialogPermanentDeleteLeadIn: string;
  dialogDelete: string;
  dialogCancel: string;
};

type UseNotesBatchActionsArgs = {
  notes: Note[];
  setNotes: Dispatch<SetStateAction<Note[]>>;
  selectedIds: string[];
  view: string;
  archived: Record<string, boolean>;
  setArchived: Dispatch<SetStateAction<Record<string, boolean>>>;
  setSelectedIds: Dispatch<SetStateAction<string[]>>;
  setSelectionMode: Dispatch<SetStateAction<boolean>>;
  operations?: NotesAPIOperations;
  queueMutation: QueueMutation;
  batchToggleStarForIds: (ids: string[]) => { count: number; allWereStarred: boolean } | null;
  show: (message: string, opts?: { icon?: ReactNode }) => void;
  requestConfirm: (args: {
    title: string;
    description: string;
    confirmLabel: string;
    cancelLabel: string;
    variant: "destructive";
    onConfirm: () => void;
  }) => void;
  deleteConfirmCopy: NotesDeleteConfirmCopy;
};

export function useNotesBatchActions({
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
  deleteConfirmCopy,
}: UseNotesBatchActionsArgs) {
  const deleteSelectedNotes = useCallback(
    (ids?: string[]) => {
      const target = ids ?? selectedIds;
      if (target.length === 0) return;
      const rows = notes.filter((note) => target.includes(note.id));
      if (rows.length === 0) return;
      const previousNotes = notes;
      const previousSelectedIds = selectedIds;
      const shouldExitSelection = target.length === selectedIds.length && selectedIds.length > 0;
      setNotes((prev) => prev.filter((note) => !target.includes(note.id)));
      setSelectedIds((prev) => prev.filter((id) => !target.includes(id)));
      if (shouldExitSelection) setSelectionMode(false);
      const rollback = () => {
        setNotes(previousNotes);
        setSelectedIds(previousSelectedIds);
        if (previousSelectedIds.length > 0) setSelectionMode(true);
      };
      queueMutation({
        key: `notes:delete:${target.slice().sort().join(",")}`,
        toastMessage: `Deleted ${target.length} item${target.length === 1 ? "" : "s"}`,
        execute: () =>
          operations
            ? Promise.all(rows.map((note) => operations.deleteNote(note))).then(() => {})
            : Promise.resolve(),
        undo: rollback,
        onError: rollback,
        undoToastMessage: "Deletion undone.",
      });
    },
    [notes, operations, queueMutation, selectedIds, setNotes, setSelectedIds, setSelectionMode],
  );

  const openDeleteConfirm = useCallback(
    (ids: string[], mode: "selected" | "all") => {
      requestConfirm({
        title:
          mode === "all"
            ? deleteConfirmCopy.dialogEmptyArchiveTitle
            : deleteConfirmCopy.dialogDeleteItemsTitle(ids.length),
        description: buildPermanentDeleteDescription({
          leadIn: deleteConfirmCopy.dialogPermanentDeleteLeadIn,
          target:
            mode === "all"
              ? deleteConfirmCopy.dialogEmptyArchiveDescription(ids.length)
              : deleteConfirmCopy.dialogDeleteSelectedDescription,
          suffix: deleteConfirmCopy.dialogDeleteConfirmSuffix,
        }),
        confirmLabel: deleteConfirmCopy.dialogDelete,
        cancelLabel: deleteConfirmCopy.dialogCancel,
        variant: "destructive",
        onConfirm: () => deleteSelectedNotes(ids),
      });
    },
    [deleteConfirmCopy, deleteSelectedNotes, requestConfirm],
  );

  const batchStar = useCallback(() => {
    const beforeRows = notes.filter((note) => selectedIds.includes(note.id));
    const result = batchToggleStarForIds(selectedIds);
    if (!result) return;
    const nextStarred = !result.allWereStarred;
    setNotes((prev) =>
      prev.map((note) =>
        selectedIds.includes(note.id) ? { ...note, starred: nextStarred } : note,
      ),
    );
    const toastMessage = `${result.allWereStarred ? "Unstarred" : "Starred"} ${result.count} item${result.count === 1 ? "" : "s"}`;
    show(toastMessage, {
      icon: result.allWereStarred ? (
        <StarOff className="size-4" />
      ) : (
        <Star className="size-4" fill="currentColor" />
      ),
    });
    if (!operations) return;
    const updatedRows = beforeRows.map((note) => ({ ...note, starred: nextStarred }));
    runQueuedBatchAction({
      queueMutation,
      key: `notes:batch-star:${selectedIds.slice().sort().join(",")}`,
      toastMessage,
      execute: () =>
        Promise.all(updatedRows.map((row) => operations.upsertNote(row))).then(() => {}),
      rollback: () => {
        batchToggleStarForIds(selectedIds);
        setNotes((prev) =>
          prev.map((note) => {
            const snapshot = beforeRows.find((row) => row.id === note.id);
            return snapshot ? snapshot : note;
          }),
        );
      },
      undoToastMessage: "Star changes undone.",
    });
  }, [batchToggleStarForIds, notes, operations, queueMutation, selectedIds, setNotes, show]);

  const batchArchive = useCallback(() => {
    const beforeRows = notes.filter((note) => selectedIds.includes(note.id));
    const beforeArchived = new Map(
      beforeRows.map((note) => [note.id, !!archived[note.id]] as const),
    );
    const allArchived = selectedIds.every((id) => archived[id]);
    const nextArchived = !allArchived;
    setArchived((state) => {
      const next = { ...state };
      selectedIds.forEach((id) => (next[id] = nextArchived));
      return next;
    });
    setNotes((prev) =>
      prev.map((note) =>
        selectedIds.includes(note.id) ? { ...note, archived: nextArchived } : note,
      ),
    );
    const toastMessage = `${allArchived ? "Unarchived" : "Archived"} ${selectedIds.length} item${selectedIds.length === 1 ? "" : "s"}`;
    show(toastMessage, {
      icon: allArchived ? <ArchiveRestore className="size-4" /> : <Archive className="size-4" />,
    });
    if (!operations) return;
    runQueuedBatchAction({
      queueMutation,
      key: `notes:batch-archive:${selectedIds.slice().sort().join(",")}`,
      toastMessage,
      execute: () =>
        Promise.all(
          selectedIds.map((id) =>
            allArchived ? operations.restoreNote(id) : operations.archiveNote(id),
          ),
        ).then(() => {}),
      rollback: () => {
        setArchived((state) => {
          const next = { ...state };
          beforeArchived.forEach((value, id) => {
            next[id] = value;
          });
          return next;
        });
        setNotes((prev) =>
          prev.map((note) => {
            const snapshot = beforeRows.find((row) => row.id === note.id);
            return snapshot ? snapshot : note;
          }),
        );
      },
      undoToastMessage: "Archive changes undone.",
    });
  }, [archived, notes, operations, queueMutation, selectedIds, setArchived, setNotes, show]);

  const requestDeleteSelected = useCallback(() => {
    if (selectedIds.length === 0) return;
    if (view === "archive") {
      openDeleteConfirm(selectedIds, "selected");
      return;
    }
    batchArchive();
  }, [batchArchive, openDeleteConfirm, selectedIds, view]);

  return {
    batchStar,
    batchArchive,
    requestDeleteSelected,
    openDeleteConfirm,
  };
}
