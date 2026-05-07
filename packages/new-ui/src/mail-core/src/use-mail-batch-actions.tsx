import { useCallback, type Dispatch, type ReactNode, type SetStateAction } from "react";
import { Archive, FolderInput, Mail as MailIcon, Star, StarOff, Trash2 } from "lucide-react";
import { runQueuedBatchAction } from "@/hooks/use-batch-actions";
import {
  collectSnapshotValues,
  nextActiveIdAfterRemoving,
  removeItemsByIds,
} from "@/hooks/collection-controller-utils";
import type { BeginOptimisticUpdateFn } from "@/hooks/use-entity-batch-actions";
import { buildPermanentDeleteDescription } from "@/lib/workspace/destructive-dialog";
import type { Mail } from "@/types/mail";
import type { MailAPIOperations } from "@/mail-core/src/mail-types";

type QueueMutation = (args: {
  key: string;
  toastMessage: string;
  execute: (signal: AbortSignal) => Promise<void>;
  undo: () => void;
  onError?: () => void;
  undoToastMessage?: string;
}) => void;

type DeleteConfirmCopy = {
  dialogDeleteMessagesTitle: (count: number) => string;
  dialogPermanentDeleteLeadIn: string;
  dialogDeleteSelectedDescription: string;
  dialogDeleteConfirmSuffix: string;
  dialogDelete: string;
  dialogCancel: string;
};

type UseMailBatchActionsArgs = {
  mail: Mail[];
  setMail: Dispatch<SetStateAction<Mail[]>>;
  selectedIds: string[];
  activeId: string;
  setActiveId: (id: string) => void;
  visibleMail: Mail[];
  inTrash: boolean;
  starred: Record<string, boolean>;
  encodeFolderToken: (label: string) => string;
  operations?: MailAPIOperations;
  show: (message: string, opts?: { icon?: ReactNode }) => void;
  showMutationError: () => void;
  queueMutation: QueueMutation;
  refreshMailboxCache: (label: string) => Promise<void>;
  beginOptimisticUpdate: BeginOptimisticUpdateFn<Mail>;
  returnMailboxById: Record<string, string>;
  setReturnMailboxById: Dispatch<SetStateAction<Record<string, string>>>;
  bumpUnreadBadgeDelta: (rows: Mail[], deltaPerMessage: -1 | 1) => void;
  requestConfirm: (args: {
    title: string;
    description: string;
    confirmLabel: string;
    cancelLabel: string;
    variant: "destructive";
    onConfirm: () => void;
  }) => void;
  deleteConfirmCopy: DeleteConfirmCopy;
  batchToggleStarForIds: (ids: string[]) => { count: number; allWereStarred: boolean } | null;
};

export function useMailBatchActions({
  mail,
  setMail,
  selectedIds,
  activeId,
  setActiveId,
  visibleMail,
  inTrash,
  starred,
  encodeFolderToken,
  operations,
  show,
  showMutationError,
  queueMutation,
  refreshMailboxCache,
  beginOptimisticUpdate,
  returnMailboxById,
  setReturnMailboxById,
  bumpUnreadBadgeDelta,
  requestConfirm,
  deleteConfirmCopy,
  batchToggleStarForIds,
}: UseMailBatchActionsArgs) {
  const moveOne = useCallback(
    (id: string, mb: string) => {
      const folder = encodeFolderToken(mb);
      const message = mail.find((m) => m.id === id);
      if (!message) return;
      const { snapshotById: beforeById, rollback } = beginOptimisticUpdate({
        ids: [id],
        updater: (row) => ({ ...row, mailbox: mb, folder }),
      });
      const previousMailbox = beforeById.get(id)?.mailbox ?? message.mailbox;
      if ((mb === "Archive" || mb === "Trash") && previousMailbox !== mb) {
        setReturnMailboxById((prev) => ({ ...prev, [id]: previousMailbox }));
      }
      if (!operations) {
        show(`Moved to ${mb}`, { icon: <FolderInput className="size-4" /> });
        return;
      }
      queueMutation({
        key: `mail:move-one:${id}`,
        toastMessage: `Moved to ${mb}`,
        execute: (_signal) =>
          operations
            .moveMessages([message], mb, { signal: _signal })
            .then(() =>
              Promise.all([
                refreshMailboxCache(previousMailbox),
                ...(previousMailbox === mb ? [] : [refreshMailboxCache(mb)]),
              ]),
            )
            .then(() => {}),
        undo: rollback,
        onError: rollback,
        undoToastMessage: "Move undone.",
      });
    },
    [
      encodeFolderToken,
      mail,
      beginOptimisticUpdate,
      setReturnMailboxById,
      operations,
      show,
      queueMutation,
      refreshMailboxCache,
    ],
  );

  const toggleArchiveForMessage = useCallback(
    (id: string) => {
      const message = mail.find((m) => m.id === id);
      if (!message) return;
      if (message.mailbox === "Archive") {
        moveOne(id, returnMailboxById[id] ?? "Inbox");
        return;
      }
      moveOne(id, "Archive");
    },
    [mail, moveOne, returnMailboxById],
  );

  const toggleTrashForMessage = useCallback(
    (id: string) => {
      const message = mail.find((m) => m.id === id);
      if (!message) return;
      if (message.mailbox === "Trash") {
        moveOne(id, returnMailboxById[id] ?? "Inbox");
        return;
      }
      moveOne(id, "Trash");
    },
    [mail, moveOne, returnMailboxById],
  );

  const markUnread = useCallback(
    (ids: string[]) => {
      const beforeById = new Map(
        mail.filter((m) => ids.includes(m.id)).map((m) => [m.id, m.unread] as const),
      );
      const changed = mail.filter((m) => ids.includes(m.id) && !m.unread);
      bumpUnreadBadgeDelta(changed, 1);
      setMail((prev) => prev.map((m) => (ids.includes(m.id) ? { ...m, unread: true } : m)));
      if (!operations) {
        show(`Marked ${ids.length} as unread`, { icon: <MailIcon className="size-4" /> });
        return;
      }
      const touched = mail.filter((m) => ids.includes(m.id));
      void Promise.all(
        touched.map((message) => operations.patchMessage(message, { read: false })),
      ).catch(() => {
        bumpUnreadBadgeDelta(changed, -1);
        setMail((prev) =>
          prev.map((m) =>
            beforeById.has(m.id) ? { ...m, unread: beforeById.get(m.id) ?? m.unread } : m,
          ),
        );
        showMutationError();
      });
    },
    [mail, bumpUnreadBadgeDelta, setMail, operations, show, showMutationError],
  );

  const markRead = useCallback(
    (ids: string[]) => {
      const beforeById = new Map(
        mail.filter((m) => ids.includes(m.id)).map((m) => [m.id, m.unread] as const),
      );
      const changed = mail.filter((m) => ids.includes(m.id) && m.unread);
      bumpUnreadBadgeDelta(changed, -1);
      setMail((prev) => prev.map((m) => (ids.includes(m.id) ? { ...m, unread: false } : m)));
      if (!operations) {
        show(`Marked ${ids.length} as read`, { icon: <MailIcon className="size-4" /> });
        return;
      }
      const touched = mail.filter((m) => ids.includes(m.id));
      void Promise.all(
        touched.map((message) => operations.patchMessage(message, { read: true })),
      ).catch(() => {
        bumpUnreadBadgeDelta(changed, 1);
        setMail((prev) =>
          prev.map((m) =>
            beforeById.has(m.id) ? { ...m, unread: beforeById.get(m.id) ?? m.unread } : m,
          ),
        );
        showMutationError();
      });
    },
    [mail, bumpUnreadBadgeDelta, setMail, operations, show, showMutationError],
  );

  const batchStar = useCallback(() => {
    const beforeStarred = new Map(selectedIds.map((id) => [id, !!starred[id]] as const));
    const result = batchToggleStarForIds(selectedIds);
    if (!result) return;
    setMail((prev) =>
      prev.map((m) =>
        beforeStarred.has(m.id) ? { ...m, starred: !(beforeStarred.get(m.id) ?? !!m.starred) } : m,
      ),
    );
    if (!operations) {
      show(`${result.allWereStarred ? "Unstarred" : "Starred"} ${result.count}`, {
        icon: result.allWereStarred ? (
          <StarOff className="size-4" />
        ) : (
          <Star className="size-4" fill="currentColor" />
        ),
      });
      return;
    }
    const changed = mail.filter((m) => beforeStarred.has(m.id));
    void Promise.all(
      changed.map((message) =>
        operations.patchMessage(message, { starred: !(beforeStarred.get(message.id) ?? false) }),
      ),
    ).catch(() => {
      batchToggleStarForIds(selectedIds);
      setMail((prev) =>
        prev.map((m) =>
          beforeStarred.has(m.id) ? { ...m, starred: beforeStarred.get(m.id) ?? !!m.starred } : m,
        ),
      );
      showMutationError();
    });
  }, [
    selectedIds,
    starred,
    batchToggleStarForIds,
    setMail,
    operations,
    show,
    mail,
    showMutationError,
  ]);

  const moveManyToMailbox = useCallback(
    (ids: string[], targetMailbox: string, toastLabel: string) => {
      const targetFolder = encodeFolderToken(targetMailbox);
      const {
        snapshotById: beforeById,
        affectedItems: toMove,
        rollback,
      } = beginOptimisticUpdate({
        ids,
        updater: (row) => ({
          ...row,
          mailbox: targetMailbox,
          folder: targetFolder,
        }),
      });
      if (!operations) {
        show(`${toastLabel} ${ids.length} message${ids.length === 1 ? "" : "s"}`, {
          icon: <Archive className="size-4" />,
        });
        return;
      }
      runQueuedBatchAction({
        queueMutation,
        key: `mail:move-many:${targetMailbox}:${ids.slice().sort().join(",")}`,
        toastMessage: `${toastLabel} ${ids.length} message${ids.length === 1 ? "" : "s"}`,
        execute: (_signal) =>
          operations
            .moveMessages(toMove, targetMailbox, { signal: _signal })
            .then(() => {
              const sourceMailboxes = collectSnapshotValues(beforeById, (row) => row.mailbox);
              const refreshTargets = new Set<string>([targetMailbox, ...sourceMailboxes]);
              return Promise.all(
                Array.from(refreshTargets).map((mailbox) => refreshMailboxCache(mailbox)),
              );
            })
            .then(() => {}),
        rollback,
        undoToastMessage: "Move undone.",
      });
    },
    [
      encodeFolderToken,
      beginOptimisticUpdate,
      operations,
      show,
      queueMutation,
      refreshMailboxCache,
    ],
  );

  const batchArchive = useCallback(() => {
    moveManyToMailbox(selectedIds, "Archive", "Archived");
  }, [moveManyToMailbox, selectedIds]);

  const batchMoveToTrash = useCallback(() => {
    const ids = selectedIds;
    const {
      snapshotById: beforeById,
      affectedItems: toMove,
      rollback,
    } = beginOptimisticUpdate({
      ids,
      updater: (row) => ({
        ...row,
        mailbox: "Trash",
        folder: encodeFolderToken("Trash"),
      }),
    });
    if (!operations) {
      show(`Moved ${ids.length} message${ids.length === 1 ? "" : "s"} to Trash`, {
        icon: <Archive className="size-4" />,
      });
      return;
    }
    runQueuedBatchAction({
      queueMutation,
      key: `mail:move-trash:${ids.slice().sort().join(",")}`,
      toastMessage: `Moved ${ids.length} message${ids.length === 1 ? "" : "s"} to Trash`,
      execute: (_signal) =>
        operations
          .moveMessages(toMove, "Trash", { signal: _signal })
          .then(() => {
            const sourceMailboxes = collectSnapshotValues(beforeById, (row) => row.mailbox);
            const refreshTargets = new Set<string>(["Trash", ...sourceMailboxes]);
            return Promise.all(
              Array.from(refreshTargets).map((mailbox) => refreshMailboxCache(mailbox)),
            );
          })
          .then(() => {}),
      rollback,
      undoToastMessage: "Trash move undone.",
    });
  }, [
    selectedIds,
    beginOptimisticUpdate,
    encodeFolderToken,
    operations,
    show,
    queueMutation,
    refreshMailboxCache,
  ]);

  const moveToMailbox = useCallback(
    (ids: string[], mailbox: string) => {
      const folder = encodeFolderToken(mailbox);
      const {
        snapshotById: beforeById,
        affectedItems: toMove,
        rollback,
      } = beginOptimisticUpdate({
        ids,
        updater: (row) => ({ ...row, mailbox, folder }),
      });
      if (!operations) {
        show(`Moved ${ids.length} to ${mailbox}`, { icon: <FolderInput className="size-4" /> });
        return;
      }
      runQueuedBatchAction({
        queueMutation,
        key: `mail:move-mailbox:${mailbox}:${ids.slice().sort().join(",")}`,
        toastMessage: `Moved ${ids.length} to ${mailbox}`,
        execute: (_signal) =>
          operations
            .moveMessages(toMove, mailbox, { signal: _signal })
            .then(() => {
              const sourceMailboxes = collectSnapshotValues(beforeById, (row) => row.mailbox);
              const refreshTargets = new Set<string>([mailbox, ...sourceMailboxes]);
              return Promise.all(
                Array.from(refreshTargets).map((target) => refreshMailboxCache(target)),
              );
            })
            .then(() => {}),
        rollback,
        undoToastMessage: "Move undone.",
      });
    },
    [
      encodeFolderToken,
      beginOptimisticUpdate,
      operations,
      show,
      queueMutation,
      refreshMailboxCache,
    ],
  );

  const permanentlyDeleteMessages = useCallback(
    (ids: string[]) => {
      if (ids.length === 0) return;
      const toDelete = mail.filter((m) => ids.includes(m.id));
      if (toDelete.length === 0) return;
      const visibleIds = visibleMail.map((m) => m.id);
      const nextVisibleId = nextActiveIdAfterRemoving(visibleIds, ids, activeId);

      setMail((prev) => removeItemsByIds(prev, ids));
      if (activeId && ids.includes(activeId)) setActiveId(nextVisibleId);
      if (!operations) {
        show(`Deleted ${toDelete.length} message${toDelete.length === 1 ? "" : "s"} permanently`, {
          icon: <Trash2 className="size-4" />,
        });
        return;
      }
      const rollback = () => {
        setMail((prev) => {
          const merged = new Map(prev.map((m) => [m.id, m] as const));
          for (const row of toDelete) merged.set(row.id, row);
          return Array.from(merged.values());
        });
        if (activeId && ids.includes(activeId)) setActiveId(activeId);
      };
      queueMutation({
        key: `mail:delete:${ids.slice().sort().join(",")}`,
        toastMessage: `Deleted ${toDelete.length} message${toDelete.length === 1 ? "" : "s"} permanently`,
        execute: (_signal) =>
          operations.deleteMessages(
            toDelete.map((m) => ({ folder: m.folder, uid: m.uid })),
            {
              signal: _signal,
            },
          ),
        undo: rollback,
        onError: rollback,
        undoToastMessage: "Deletion undone.",
      });
    },
    [mail, visibleMail, activeId, setMail, setActiveId, operations, show, queueMutation],
  );

  const requestDeleteSelected = useCallback(() => {
    if (selectedIds.length === 0) return;
    if (!inTrash) {
      batchMoveToTrash();
      return;
    }
    requestConfirm({
      title: deleteConfirmCopy.dialogDeleteMessagesTitle(selectedIds.length),
      description: buildPermanentDeleteDescription({
        leadIn: deleteConfirmCopy.dialogPermanentDeleteLeadIn,
        target: deleteConfirmCopy.dialogDeleteSelectedDescription,
        suffix: deleteConfirmCopy.dialogDeleteConfirmSuffix,
      }),
      confirmLabel: deleteConfirmCopy.dialogDelete,
      cancelLabel: deleteConfirmCopy.dialogCancel,
      variant: "destructive",
      onConfirm: () => permanentlyDeleteMessages(selectedIds),
    });
  }, [
    selectedIds,
    inTrash,
    batchMoveToTrash,
    requestConfirm,
    deleteConfirmCopy,
    permanentlyDeleteMessages,
  ]);

  return {
    moveOne,
    toggleArchiveForMessage,
    toggleTrashForMessage,
    markUnread,
    markRead,
    batchStar,
    moveToMailbox,
    batchArchive,
    requestDeleteSelected,
  };
}
