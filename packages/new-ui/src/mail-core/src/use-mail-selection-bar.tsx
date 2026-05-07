import { useMemo, type ReactNode } from "react";
import { X } from "lucide-react";
import { FloatingActionBar } from "@/floating-action-bar/src/floating-action-bar";
import {
  buildMailActionButtons,
  type MailActionButtonDescriptor,
} from "@/mail-core/src/mail-action-buttons";
import type { Mail } from "@/types/mail";

type UseMailSelectionBarArgs = {
  mail: Mail[];
  selectedIds: string[];
  selectionMode: boolean;
  activeId: string;
  effectiveStarred: Record<string, boolean>;
  view: string;
  exitSelection: (fallbackId?: string) => void;
  setMoveDialog: (dialog: { ids: string[]; currentMailbox?: string } | null) => void;
  markRead: (ids: string[]) => void;
  markUnread: (ids: string[]) => void;
  batchStar: () => void;
  moveToMailbox: (ids: string[], mailbox: string) => void;
  batchArchive: () => void;
  requestDeleteSelected: () => void;
  labels: {
    selectionMoveToMailbox: string;
    selectionMarkUnread: string;
    selectionStar: string;
    selectionArchive: string;
    toolbarRestore: string;
    selectionDone: string;
  };
};

export type MailSelectionBarButton =
  | MailActionButtonDescriptor
  | {
      label: string;
      icon: ReactNode;
      onClick: () => void;
    };

export function useMailSelectionBar({
  mail,
  selectedIds,
  selectionMode,
  activeId,
  effectiveStarred,
  view,
  exitSelection,
  setMoveDialog,
  markRead,
  markUnread,
  batchStar,
  moveToMailbox,
  batchArchive,
  requestDeleteSelected,
  labels,
}: UseMailSelectionBarArgs) {
  const selectedRows = useMemo(
    () => mail.filter((row) => selectedIds.includes(row.id)),
    [mail, selectedIds],
  );
  const allSelectedUnread = selectedRows.length > 0 && selectedRows.every((row) => row.unread);
  const allSelectedStarred =
    selectedRows.length > 0 && selectedRows.every((row) => !!effectiveStarred[row.id]);
  const allSelectedArchived =
    selectedRows.length > 0 && selectedRows.every((row) => row.mailbox === "Archive");
  const allSelectedTrashed =
    selectedRows.length > 0 && selectedRows.every((row) => row.mailbox === "Trash");

  const selectionActionButtons = useMemo(
    () =>
      buildMailActionButtons({
        moveToMailbox: () => {
          const selectedMailboxes = new Set(selectedRows.map((row) => row.mailbox));
          const currentMailbox =
            selectedMailboxes.size === 1
              ? Array.from(selectedMailboxes)[0]
              : view.startsWith("mb:")
                ? view.slice(3)
                : undefined;
          setMoveDialog({ ids: selectedIds, currentMailbox });
        },
        toggleUnread: () => (allSelectedUnread ? markRead(selectedIds) : markUnread(selectedIds)),
        toggleStar: batchStar,
        toggleArchive: () =>
          allSelectedArchived ? moveToMailbox(selectedIds, "Inbox") : batchArchive(),
        toggleTrash: () =>
          allSelectedTrashed ? moveToMailbox(selectedIds, "Inbox") : requestDeleteSelected(),
        isUnread: allSelectedUnread,
        isStarred: allSelectedStarred,
        isArchived: allSelectedArchived,
        isTrashed: allSelectedTrashed,
        labels: {
          moveToMailbox: labels.selectionMoveToMailbox,
          markUnread: labels.selectionMarkUnread,
          star: labels.selectionStar,
          archive: labels.selectionArchive,
          restoreFromTrash: labels.toolbarRestore,
        },
      }),
    [
      selectedRows,
      view,
      setMoveDialog,
      selectedIds,
      allSelectedUnread,
      markRead,
      markUnread,
      batchStar,
      allSelectedArchived,
      moveToMailbox,
      batchArchive,
      allSelectedTrashed,
      requestDeleteSelected,
      allSelectedStarred,
      labels.selectionMoveToMailbox,
      labels.selectionMarkUnread,
      labels.selectionStar,
      labels.selectionArchive,
      labels.toolbarRestore,
    ],
  );

  const selectionBarButtons = useMemo<MailSelectionBarButton[]>(
    () => [
      ...selectionActionButtons,
      {
        label: labels.selectionDone,
        icon: <X className="size-4" />,
        onClick: () => exitSelection(activeId),
      },
    ],
    [selectionActionButtons, labels.selectionDone, exitSelection, activeId],
  );

  const selectionBar =
    selectionMode || selectedIds.length > 1 ? (
      <FloatingActionBar
        items={selectedIds.length}
        buttons={selectionBarButtons}
        className="md:hidden"
      />
    ) : null;

  return { selectionBarButtons, selectionBar };
}
