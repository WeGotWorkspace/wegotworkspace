import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { MouseEvent as ReactMouseEvent } from "react";
import { FileEdit, Star, StarOff, X } from "lucide-react";
import { useAppToast } from "@/hooks/use-app-toast";
import { useSelectionResetOnKeyChange } from "@/hooks/use-selection-reset-on-key-change";
import { useConfirmDialog } from "@/hooks/use-confirm-dialog";
import { useStarredMap } from "@/hooks/use-starred-map";
import { useIsTouch } from "@/hooks/use-is-touch";
import { useWorkspaceListController } from "@/hooks/use-workspace-list-controller";
import { useWorkspaceListKeyboardShortcuts } from "@/hooks/use-workspace-list-keyboard-shortcuts";
import type { WorkspaceAppHandle } from "@/workspace-app/src/workspace-app";
import type { Mail, MailAttachment } from "@/types/mail";
import type { WorkspaceSession } from "@/lib/workspace/workspace-session";
import type {
  MailboxSummary,
  MailMailboxLoader,
  MailAPIOperations,
} from "@/mail-core/src/mail-types";
import { mergeMailLabels, type MailUILabels } from "@/mail-core/src/mail-app.stories.fixtures";
import {
  composeDraftHasContent,
  composeDraftToApiPayload,
  isComposeDraftDirty,
  serializeComposeSnapshot,
  type MailComposeAttachment,
} from "@/mail-core/src/mail-compose-utils";
import {
  buildMoveMailboxOptions,
  resolveMoveDialogCurrentMailbox,
} from "@/mail-core/src/mail-move-dialog";
import { useMailBatchActions } from "@/mail-core/src/use-mail-batch-actions";
import { useMailSelectionBar } from "@/mail-core/src/use-mail-selection-bar";
import { compareMailDesc } from "@/mail-core/src/mail-date-utils";
import { plainTextFromMailDetail } from "@/mail-core/src/mail-detail-content";

type MailboxLoadState = {
  offset: number;
  hasMore: boolean;
  loading: boolean;
};

const DEFAULT_MAILBOX_PAGE_SIZE = 40;
const PRIMARY_MAILBOXES = ["Inbox", "Starred"] as const;
const WRITE_QUEUE_DELAY_MS = 2500;

type ComposeMode = "new" | "reply" | "reply-all" | "forward" | "draft";

type MailComposeDraft = {
  mode: ComposeMode;
  to: string;
  cc: string;
  bcc: string;
  subject: string;
  body: string;
  attachments: MailComposeAttachment[];
  saving: boolean;
  sending: boolean;
};

const EMPTY_COMPOSE_ATTACHMENTS: MailComposeAttachment[] = [];

function splitDetailBodyParagraphs(body: string): string[] {
  const cleaned = body.trim();
  if (!cleaned) return [""];
  const parts = cleaned
    .split(/\n\n+/)
    .map((part) => part.trim())
    .filter(Boolean);
  return parts.length > 0 ? parts : [cleaned];
}

function ensureSubjectPrefix(subject: string, prefix: "Re" | "Fwd"): string {
  const trimmed = subject.trim();
  if (!trimmed) return `${prefix}: `;
  const pattern = prefix === "Re" ? /^\s*re:/i : /^\s*fwd:/i;
  return pattern.test(trimmed) ? trimmed : `${prefix}: ${trimmed}`;
}

function normalizeComposeSubject(subject: string, noSubjectLabel: string): string | undefined {
  const normalized = subject.trim();
  if (!normalized) return undefined;
  if (normalized.toLowerCase() === noSubjectLabel.trim().toLowerCase()) return undefined;
  if (normalized.toLowerCase() === "(no subject)") return undefined;
  return normalized;
}

function quotedOriginalMessage(source: Mail): string {
  const sourceBody = source.body.join("\n\n").trim() || source.excerpt.trim();
  if (!sourceBody) return "";
  const header = [
    "",
    "",
    "--- Original message ---",
    `From: ${source.from}${source.email ? ` <${source.email}>` : ""}`,
    `Subject: ${source.title || "(no subject)"}`,
    "",
  ].join("\n");
  const quotedBody = sourceBody
    .split("\n")
    .map((line) => `> ${line}`)
    .join("\n");
  return `${header}${quotedBody}`;
}

function draftForMode(mode: ComposeMode, source?: Mail): MailComposeDraft {
  if (!source) {
    return {
      mode,
      to: "",
      cc: "",
      bcc: "",
      subject: "",
      body: "",
      attachments: EMPTY_COMPOSE_ATTACHMENTS,
      saving: false,
      sending: false,
    };
  }
  if (mode === "draft") {
    return {
      mode,
      to: "",
      cc: "",
      bcc: "",
      subject: source.title,
      body: source.body.join("\n\n"),
      attachments: EMPTY_COMPOSE_ATTACHMENTS,
      saving: false,
      sending: false,
    };
  }
  if (mode === "forward") {
    return {
      mode,
      to: "",
      cc: "",
      bcc: "",
      subject: ensureSubjectPrefix(source.title, "Fwd"),
      body: quotedOriginalMessage(source),
      attachments: EMPTY_COMPOSE_ATTACHMENTS,
      saving: false,
      sending: false,
    };
  }
  return {
    mode,
    to: source.email,
    cc: "",
    bcc: "",
    subject: ensureSubjectPrefix(source.title, "Re"),
    body: quotedOriginalMessage(source),
    attachments: EMPTY_COMPOSE_ATTACHMENTS,
    saving: false,
    sending: false,
  };
}

function withDetailLoadedFlag(row: Mail): Mail {
  return { ...row, detailLoaded: row.detailLoaded ?? false };
}

type UseMailUIControllerArgs = {
  messages: Mail[];
  mailboxes: MailboxSummary[];
  session: WorkspaceSession;
  labels?: Partial<MailUILabels>;
  listLoading: boolean;
  systemMailboxes: readonly string[];
  encodeFolderToken: (label: string) => string;
  mailboxLoader?: MailMailboxLoader;
  operations?: MailAPIOperations;
  initialActiveId?: string;
};

export function useMailController({
  messages,
  mailboxes,
  session,
  labels,
  listLoading,
  systemMailboxes,
  encodeFolderToken,
  mailboxLoader,
  operations,
  initialActiveId = "",
}: UseMailUIControllerArgs) {
  const L = useMemo(() => mergeMailLabels(labels), [labels]);
  const allSystemMailboxes = systemMailboxes;
  const mailboxMetadata = mailboxes;
  const secondarySystemMailboxes = useMemo(
    () => allSystemMailboxes.filter((mailbox) => mailbox !== "Inbox" && mailbox !== "Starred"),
    [allSystemMailboxes],
  );
  const moreMailboxes = useMemo(() => {
    const excluded = new Set<string>([...PRIMARY_MAILBOXES, ...allSystemMailboxes]);
    return mailboxMetadata
      .map((mailbox) => mailbox.label)
      .filter((label, idx, arr) => arr.indexOf(label) === idx)
      .filter((label) => !excluded.has(label));
  }, [allSystemMailboxes, mailboxMetadata]);
  const seededUnreadByMailbox = useMemo(() => {
    const out: Record<string, number> = {};
    for (const mailbox of mailboxMetadata) {
      if (mailbox.unreadCount === undefined) continue;
      out[mailbox.label] = mailbox.unreadCount;
    }
    return out;
  }, [mailboxMetadata]);
  const [mail, setMail] = useState<Mail[]>(() => messages.map(withDetailLoadedFlag));
  const mailRef = useRef<Mail[]>(mail);
  const lastSearchFetchKeyRef = useRef<string>("");
  useEffect(() => {
    mailRef.current = mail;
  }, [mail]);
  const [activeId, setActiveId] = useState<string>(initialActiveId);
  const initialStarred = useMemo(() => {
    const map: Record<string, boolean> = {};
    for (const row of messages) {
      if (row.starred) map[row.id] = true;
    }
    return map;
  }, [messages]);
  const {
    starred,
    toggleStar: applyStarToggle,
    batchToggleStarForIds,
  } = useStarredMap(initialStarred);
  const workspaceLayoutRef = useRef<WorkspaceAppHandle>(null);
  const [view, setView] = useState<string>(() => "mb:Inbox");
  const [moveDialog, setMoveDialog] = useState<{ ids: string[]; currentMailbox?: string } | null>(
    null,
  );
  const [composeDrafts, setComposeDrafts] = useState<Record<string, MailComposeDraft>>({});
  const [composeDialogId, setComposeDialogId] = useState<string | null>(null);
  const composeBaselineRef = useRef<Record<string, string>>({});
  const [returnMailboxById, setReturnMailboxById] = useState<Record<string, string>>({});
  const [searchQuery, setSearchQuery] = useState("");
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const listEndRef = useRef<HTMLDivElement | null>(null);
  const attemptedAutoReadSyncRef = useRef<Set<string>>(new Set());
  const fetchedDetailIdsRef = useRef<Set<string>>(new Set());
  const pendingDetailIdsRef = useRef<Set<string>>(new Set());

  const { show, showError } = useAppToast();
  const { confirmDialog, requestConfirm, consumeParentDismissSuppression } = useConfirmDialog({
    contentClassName: "mail-dialog-surface",
  });
  const isTouch = useIsTouch();
  const showMutationError = useCallback(
    (fallback = "Could not sync this change. Please try again.") => showError(fallback),
    [showError],
  );

  const [loadingMailbox, setLoadingMailbox] = useState<string | null>(null);
  const [unreadBadgeDeltas, setUnreadBadgeDeltas] = useState<Record<string, number>>({});
  const [mailboxLoadState, setMailboxLoadState] = useState<Record<string, MailboxLoadState>>(() => {
    const byMailbox: Record<string, number> = {};
    for (const row of messages) {
      byMailbox[row.mailbox] = (byMailbox[row.mailbox] ?? 0) + 1;
    }
    const out: Record<string, MailboxLoadState> = {};
    for (const [mailbox, count] of Object.entries(byMailbox)) {
      out[mailbox] = {
        offset: count,
        hasMore: count >= DEFAULT_MAILBOX_PAGE_SIZE,
        loading: false,
      };
    }
    return out;
  });
  const bumpUnreadBadgeDelta = useCallback((rows: Mail[], deltaPerMessage: -1 | 1) => {
    if (rows.length === 0) return;
    setUnreadBadgeDeltas((prev) => {
      const next = { ...prev };
      for (const row of rows) {
        next[row.mailbox] = (next[row.mailbox] ?? 0) + deltaPerMessage;
        if (next[row.mailbox] === 0) delete next[row.mailbox];
      }
      return next;
    });
  }, []);

  const rowMatchesMailboxLabel = useCallback(
    (m: Mail, sidebarLabel: string) => {
      if (m.mailbox === sidebarLabel || m.mailbox.toLowerCase() === sidebarLabel.toLowerCase()) {
        return true;
      }
      const token = mailboxLoader?.folderTokenForLabel?.(sidebarLabel);
      return token != null && m.folder === token;
    },
    [mailboxLoader],
  );

  const visibleMail = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const filtered = mail.filter((m) => {
      let inView = true;
      if (view.startsWith("mb:")) {
        const want = view.slice(3);
        inView = rowMatchesMailboxLabel(m, want);
      }
      if (!inView) return false;
      // In live mode, server-side search already filters rows by q.
      if (mailboxLoader) return true;
      if (!q) return true;
      const hay = `${m.from} ${m.title} ${m.excerpt} ${m.body.join(" ")}`.toLowerCase();
      return hay.includes(q);
    });
    return filtered.sort(compareMailDesc);
  }, [mail, view, searchQuery, rowMatchesMailboxLabel, mailboxLoader]);

  const loadMailboxPage = useCallback(
    async (label: string, offset: number) => {
      if (!mailboxLoader) return;

      setMailboxLoadState((prev) => ({
        ...prev,
        [label]: { offset, hasMore: prev[label]?.hasMore ?? true, loading: true },
      }));
      setLoadingMailbox(label);

      try {
        const page = await mailboxLoader.loadMailbox(label, {
          offset,
          limit: DEFAULT_MAILBOX_PAGE_SIZE,
          query: searchQuery.trim(),
        });
        setMail((prev) => {
          const target = prev.filter((m) => rowMatchesMailboxLabel(m, label));
          const other = prev.filter((m) => !rowMatchesMailboxLabel(m, label));
          const combined = offset === 0 ? page.rows : [...target, ...page.rows];
          const deduped = new Map<string, Mail>();
          for (const row of combined) deduped.set(row.id, withDetailLoadedFlag(row));
          const sorted = Array.from(deduped.values()).sort(compareMailDesc);
          return [...other, ...sorted];
        });
        setMailboxLoadState((prev) => ({
          ...prev,
          [label]: {
            offset: page.nextOffset,
            hasMore: page.hasMore,
            loading: false,
          },
        }));
        setUnreadBadgeDeltas((prev) => {
          if (!(label in prev)) return prev;
          const next = { ...prev };
          delete next[label];
          return next;
        });
      } catch {
        setMailboxLoadState((prev) => ({
          ...prev,
          [label]: {
            offset: prev[label]?.offset ?? offset,
            hasMore: prev[label]?.hasMore ?? true,
            loading: false,
          },
        }));
      } finally {
        setLoadingMailbox((current) => (current === label ? null : current));
      }
    },
    [mailboxLoader, rowMatchesMailboxLabel, searchQuery],
  );

  const refreshMailboxCache = useCallback(
    async (label: string) => {
      if (!mailboxLoader) return;
      try {
        const page = await mailboxLoader.loadMailbox(label, {
          offset: 0,
          limit: DEFAULT_MAILBOX_PAGE_SIZE,
          query: searchQuery.trim(),
        });
        setMail((prev) => {
          const other = prev.filter((m) => !rowMatchesMailboxLabel(m, label));
          const deduped = new Map<string, Mail>();
          for (const row of page.rows) deduped.set(row.id, withDetailLoadedFlag(row));
          const sorted = Array.from(deduped.values()).sort(compareMailDesc);
          return [...other, ...sorted];
        });
        setMailboxLoadState((prev) => ({
          ...prev,
          [label]: {
            offset: page.nextOffset,
            hasMore: page.hasMore,
            loading: false,
          },
        }));
        setUnreadBadgeDeltas((prev) => {
          if (!(label in prev)) return prev;
          const next = { ...prev };
          delete next[label];
          return next;
        });
      } catch {
        // Best-effort background refresh only.
      }
    },
    [mailboxLoader, rowMatchesMailboxLabel, searchQuery],
  );

  useEffect(() => {
    if (!mailboxLoader || !view.startsWith("mb:")) return;
    const label = view.slice(3);
    const state = mailboxLoadState[label];
    if (state?.loading) return;
    if (!state) {
      void loadMailboxPage(label, 0);
      return;
    }
    if (state.offset === 0 && state.hasMore) {
      void loadMailboxPage(label, 0);
    }
  }, [view, mailboxLoader, mailboxLoadState, loadMailboxPage]);

  useEffect(() => {
    if (!mailboxLoader || !view.startsWith("mb:")) return;
    const label = view.slice(3);
    const query = searchQuery.trim();
    const key = `${label}::${query}`;
    if (lastSearchFetchKeyRef.current === key) return;
    lastSearchFetchKeyRef.current = key;
    void loadMailboxPage(label, 0);
  }, [searchQuery, view, mailboxLoader, loadMailboxPage]);

  useEffect(() => {
    const ids = visibleMail.map((m) => m.id);
    if (ids.length === 0) {
      if (activeId) setActiveId("");
      return;
    }
    if (!ids.includes(activeId)) setActiveId("");
  }, [visibleMail, activeId]);

  const viewLabel = useMemo(() => {
    if (view.startsWith("mb:")) return view.slice(3);
    return L.fallbackViewTitle;
  }, [view, L]);

  const activeMailbox = view.startsWith("mb:") ? view.slice(3) : null;
  const activeMailboxState = activeMailbox ? mailboxLoadState[activeMailbox] : undefined;
  const isLoadingMore =
    !!activeMailbox &&
    !listLoading &&
    !!activeMailboxState?.loading &&
    !!activeMailboxState?.offset &&
    activeMailboxState.offset > 0;
  const effectiveListLoading =
    listLoading ||
    (!!activeMailbox &&
      loadingMailbox === activeMailbox &&
      (!activeMailboxState || activeMailboxState.offset === 0));

  useEffect(() => {
    if (!mailboxLoader || !activeMailbox || !listEndRef.current) return;
    if (!activeMailboxState?.hasMore || activeMailboxState.loading) return;
    if (effectiveListLoading) return;

    const el = listEndRef.current;
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        void loadMailboxPage(activeMailbox, activeMailboxState.offset);
      },
      { root: null, rootMargin: "180px 0px", threshold: 0.01 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [
    mailboxLoader,
    activeMailbox,
    activeMailboxState?.hasMore,
    activeMailboxState?.loading,
    activeMailboxState?.offset,
    effectiveListLoading,
    loadMailboxPage,
  ]);

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
  } = useWorkspaceListController<Mail>({
    items: mail,
    setItems: setMail,
    visibleIds: visibleMail.map((m) => m.id),
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

  const active: Mail | undefined = activeId ? mail.find((m) => m.id === activeId) : undefined;
  const inTrash = view === "mb:Trash";
  const effectiveStarred = useMemo(() => {
    const merged: Record<string, boolean> = {};
    for (const row of mail) merged[row.id] = starred[row.id] ?? !!row.starred;
    return merged;
  }, [mail, starred]);

  const unreadByMailbox = useMemo(() => {
    const byMailbox: Record<string, number> = {};
    for (const m of mail) {
      if (!m.unread) continue;
      byMailbox[m.mailbox] = (byMailbox[m.mailbox] ?? 0) + 1;
    }
    return byMailbox;
  }, [mail]);

  const sidebarUnreadBadge = useCallback(
    (mailboxLabel: string): number | undefined => {
      const seeded = seededUnreadByMailbox[mailboxLabel];
      const delta = unreadBadgeDeltas[mailboxLabel] ?? 0;
      if (seeded !== undefined) {
        const count = seeded + delta;
        return count > 0 ? count : undefined;
      }
      const liveCount = unreadByMailbox[mailboxLabel];
      const count = liveCount === undefined ? undefined : liveCount + delta;
      return count && count > 0 ? count : undefined;
    },
    [seededUnreadByMailbox, unreadByMailbox, unreadBadgeDeltas],
  );

  useEffect(() => {
    if (operations || !active) return;
    if (active.detailLoaded) return;
    const hasSeededDetail =
      Boolean(active.bodyHtml?.trim()) ||
      active.body.some((paragraph) => paragraph.trim().length > 0);
    if (!hasSeededDetail) return;
    setMail((prev) =>
      prev.map((message) =>
        message.id === active.id ? { ...message, detailLoaded: true } : message,
      ),
    );
  }, [active, operations]);

  useEffect(() => {
    if (!operations || !active) return;
    if (active.detailLoaded) {
      fetchedDetailIdsRef.current.add(active.id);
      return;
    }
    if (fetchedDetailIdsRef.current.has(active.id)) return;
    if (pendingDetailIdsRef.current.has(active.id)) return;
    const targetId = active.id;
    pendingDetailIdsRef.current.add(targetId);
    let cancelled = false;
    void operations
      .fetchMessageDetail({ folder: active.folder, uid: active.uid })
      .then((detail) => {
        pendingDetailIdsRef.current.delete(targetId);
        if (cancelled) return;
        if (!detail) {
          setMail((prev) =>
            prev.map((m) => (m.id === targetId ? { ...m, detailLoaded: true } : m)),
          );
          fetchedDetailIdsRef.current.add(targetId);
          return;
        }
        const fullBodySource = plainTextFromMailDetail(detail);
        const body = splitDetailBodyParagraphs(fullBodySource);
        const excerpt = fullBodySource.replace(/\s+/g, " ").trim();
        setMail((prev) =>
          prev.map((m) =>
            m.id === targetId
              ? {
                  ...m,
                  body: body.some((p) => p.length > 0) ? body : m.body,
                  bodyHtml: detail.bodyHtml ?? undefined,
                  detailLoaded: true,
                  excerpt: excerpt.length > 0 ? excerpt.slice(0, 180) : m.excerpt,
                  attachments: detail.attachments ?? m.attachments,
                }
              : m,
          ),
        );
        fetchedDetailIdsRef.current.add(targetId);
      })
      .catch(() => {
        pendingDetailIdsRef.current.delete(targetId);
      });
    return () => {
      cancelled = true;
    };
  }, [active, operations]);

  useEffect(() => {
    if (!activeId) return;
    const opened = mailRef.current.find((m) => m.id === activeId);
    if (!opened?.unread) return;
    bumpUnreadBadgeDelta([opened], -1);
    setMail((prev) => prev.map((m) => (m.id === activeId ? { ...m, unread: false } : m)));
    if (!operations) return;
    if (attemptedAutoReadSyncRef.current.has(activeId)) return;
    attemptedAutoReadSyncRef.current.add(activeId);
    void operations.patchMessage(opened, { read: true }).catch(() => {
      bumpUnreadBadgeDelta([opened], 1);
      setMail((prev) => prev.map((m) => (m.id === activeId ? { ...m, unread: true } : m)));
      showMutationError();
    });
  }, [activeId, operations, showMutationError, bumpUnreadBadgeDelta]);

  const toggleStar = useCallback(
    (id: string) => {
      const result = batchToggleStarForIds([id]);
      if (!result) return;
      const beforeStarred = result.allWereStarred;
      const nowStarred = !result.allWereStarred;
      setMail((prev) => prev.map((m) => (m.id === id ? { ...m, starred: nowStarred } : m)));
      if (!operations) {
        show(nowStarred ? "Starred" : "Unstarred", {
          icon: nowStarred ? (
            <Star className="size-4" fill="currentColor" />
          ) : (
            <StarOff className="size-4" />
          ),
        });
        return;
      }
      const message = mail.find((m) => m.id === id);
      if (!message) return;
      const rollback = () => {
        batchToggleStarForIds([id]);
        setMail((prev) => prev.map((m) => (m.id === id ? { ...m, starred: beforeStarred } : m)));
      };
      queueMutation({
        key: `mail:star:${id}`,
        toastMessage: nowStarred ? "Starred" : "Unstarred",
        execute: (_signal) =>
          operations.patchMessage(message, { starred: nowStarred }, { signal: _signal }),
        undo: rollback,
        onError: () => {
          rollback();
          showMutationError();
        },
        undoToastMessage: "Star change undone.",
      });
    },
    [batchToggleStarForIds, show, operations, mail, queueMutation, showMutationError],
  );

  const {
    moveOne,
    toggleArchiveForMessage,
    toggleTrashForMessage,
    markUnread,
    markRead,
    batchStar,
    moveToMailbox,
    batchArchive,
    requestDeleteSelected,
  } = useMailBatchActions({
    mail,
    setMail,
    selectedIds,
    activeId,
    setActiveId,
    visibleMail,
    inTrash,
    starred: effectiveStarred,
    encodeFolderToken,
    operations,
    show,
    queueMutation,
    refreshMailboxCache,
    beginOptimisticUpdate,
    returnMailboxById,
    setReturnMailboxById,
    bumpUnreadBadgeDelta,
    requestConfirm,
    deleteConfirmCopy: {
      dialogDeleteMessagesTitle: L.dialogDeleteMessagesTitle,
      dialogPermanentDeleteLeadIn: L.dialogPermanentDeleteLeadIn,
      dialogDeleteSelectedDescription: L.dialogDeleteSelectedDescription,
      dialogDeleteConfirmSuffix: L.dialogDeleteConfirmSuffix,
      dialogDelete: L.dialogDelete,
      dialogCancel: L.dialogCancel,
    },
    batchToggleStarForIds,
  });

  useWorkspaceListKeyboardShortcuts({
    searchInputRef,
    selectedCount: selectedIds.length,
    onRequestDeleteSelection: requestDeleteSelected,
    onNavigateList: navigateListByKeyboard,
    onUndoQueuedAction: undoLatest,
  });

  const syncMailRowFromCompose = useCallback((id: string, draft: MailComposeDraft) => {
    setMail((prev) =>
      prev.map((message) =>
        message.id === id
          ? {
              ...message,
              title: draft.subject,
              excerpt: draft.body.replace(/\s+/g, " ").trim().slice(0, 180),
              body: splitDetailBodyParagraphs(draft.body),
              detailLoaded: true,
            }
          : message,
      ),
    );
  }, []);

  const ensureComposeDraftForMessage = useCallback(
    (message: Mail, mode: ComposeMode = "draft"): MailComposeDraft => {
      const existing = composeDrafts[message.id];
      if (existing) return existing;
      const seeded: MailComposeDraft =
        mode === "draft"
          ? {
              mode,
              to: "",
              cc: "",
              bcc: "",
              subject: message.title,
              body: message.body.join("\n\n"),
              attachments: EMPTY_COMPOSE_ATTACHMENTS,
              saving: false,
              sending: false,
            }
          : draftForMode(mode, message);
      setComposeDrafts((prev) => ({ ...prev, [message.id]: seeded }));
      return seeded;
    },
    [composeDrafts],
  );

  const openComposeDialog = useCallback((messageId: string) => {
    setComposeDialogId(messageId);
    workspaceLayoutRef.current?.openMobileDetail();
  }, []);

  const closeComposeDialog = useCallback(() => {
    setComposeDialogId((current) => {
      if (current) delete composeBaselineRef.current[current];
      return null;
    });
  }, []);

  useEffect(() => {
    if (!composeDialogId) return;
    const draft = composeDrafts[composeDialogId];
    if (!draft || composeBaselineRef.current[composeDialogId]) return;
    composeBaselineRef.current[composeDialogId] = serializeComposeSnapshot(draft);
  }, [composeDialogId, composeDrafts]);

  const startCompose = useCallback(
    (mode: ComposeMode, source?: Mail) => {
      const id = `m-${Date.now()}`;
      const selfLabel = L.draftFromLabel;
      const draftState = draftForMode(mode, source);
      const draft: Mail = {
        id,
        folder: encodeFolderToken("Drafts"),
        uid: Math.floor(Math.random() * 1_000_000_000),
        from: selfLabel,
        email: session.user.email ?? "",
        notebook: selfLabel,
        category: "Draft",
        date: "Now",
        title: draftState.subject,
        excerpt: draftState.body.replace(/\s+/g, " ").trim().slice(0, 180),
        body: splitDetailBodyParagraphs(draftState.body),
        tags: [],
        wordCount: 0,
        mailbox: "Drafts",
        unread: false,
        detailLoaded: true,
      };
      setMail((prev) => [draft, ...prev]);
      setComposeDrafts((prev) => ({ ...prev, [id]: draftState }));
      openComposeDialog(id);
      if (mode === "new") {
        show(L.toastNewMessage, { icon: <FileEdit className="size-4" /> });
      }
      if (!operations) return;
      void composeDraftToApiPayload(draftState, (subject) =>
        normalizeComposeSubject(subject, L.noSubject),
      )
        .then((draftPayload) => operations.createDraft(draftPayload))
        .catch(() => {
          show("Draft created locally, but could not sync to server yet.", {
            icon: <FileEdit className="size-4" />,
          });
        });
    },
    [
      L.draftFromLabel,
      L.noSubject,
      L.toastNewMessage,
      encodeFolderToken,
      session.user.email,
      show,
      operations,
      openComposeDialog,
    ],
  );

  const compose = useCallback(() => {
    startCompose("new");
  }, [startCompose]);

  const reply = useCallback(() => {
    if (!active) return;
    startCompose("reply", active);
  }, [active, startCompose]);

  const replyAll = useCallback(() => {
    if (!active) return;
    startCompose("reply-all", active);
  }, [active, startCompose]);

  const forward = useCallback(() => {
    if (!active) return;
    startCompose("forward", active);
  }, [active, startCompose]);

  const openDraftInComposer = useCallback(
    (id: string) => {
      const message = mail.find((candidate) => candidate.id === id);
      if (!message) return;
      if (message.mailbox !== "Drafts" && !composeDrafts[id]) return;
      ensureComposeDraftForMessage(message, "draft");
      openComposeDialog(id);
    },
    [mail, composeDrafts, ensureComposeDraftForMessage, openComposeDialog],
  );

  const updateComposeDraft = useCallback(
    (
      id: string,
      patch: Partial<
        Pick<MailComposeDraft, "to" | "cc" | "bcc" | "subject" | "body" | "attachments">
      >,
    ) => {
      setComposeDrafts((prev) => {
        const current = prev[id];
        if (!current) return prev;
        const next = { ...current, ...patch };
        syncMailRowFromCompose(id, next);
        return { ...prev, [id]: next };
      });
    },
    [syncMailRowFromCompose],
  );

  const saveComposeDraft = useCallback(
    async (id: string) => {
      const draft = composeDrafts[id];
      if (!draft) return;
      if (!operations) {
        show("Draft saved locally.", { icon: <FileEdit className="size-4" /> });
        return;
      }
      setComposeDrafts((prev) =>
        prev[id] ? { ...prev, [id]: { ...prev[id]!, saving: true } } : prev,
      );
      try {
        const draftPayload = await composeDraftToApiPayload(draft, (subject) =>
          normalizeComposeSubject(subject, L.noSubject),
        );
        await operations.saveDraft(draftPayload);
        composeBaselineRef.current[id] = serializeComposeSnapshot(draft);
        show("Draft saved.", { icon: <FileEdit className="size-4" /> });
      } catch {
        show("Saved locally. Server draft sync is unavailable right now.", {
          icon: <FileEdit className="size-4" />,
        });
      } finally {
        setComposeDrafts((prev) =>
          prev[id] ? { ...prev, [id]: { ...prev[id]!, saving: false } } : prev,
        );
      }
    },
    [composeDrafts, operations, show, L.noSubject],
  );

  const sendComposeDraft = useCallback(
    async (id: string) => {
      const draft = composeDrafts[id];
      if (!draft) return;
      if (!draft.to.trim()) {
        show("Add at least one recipient in To.", {
          icon: <X className="size-4" />,
          severity: "warning",
        });
        return;
      }
      setComposeDrafts((prev) =>
        prev[id] ? { ...prev, [id]: { ...prev[id]!, sending: true } } : prev,
      );
      try {
        if (operations) {
          const draftPayload = await composeDraftToApiPayload(draft, (subject) =>
            normalizeComposeSubject(subject, L.noSubject),
          );
          await operations.sendMessage({
            to: draft.to,
            ...draftPayload,
          });
        }
        setComposeDrafts((prev) => {
          const next = { ...prev };
          delete next[id];
          return next;
        });
        delete composeBaselineRef.current[id];
        closeComposeDialog();
        setMail((prev) =>
          prev.map((message) =>
            message.id === id
              ? {
                  ...message,
                  mailbox: "Sent",
                  folder: encodeFolderToken("Sent"),
                  category: "Sent",
                  date: "Now",
                  title: draft.subject,
                  excerpt: draft.body.replace(/\s+/g, " ").trim().slice(0, 180),
                  body: splitDetailBodyParagraphs(draft.body),
                }
              : message,
          ),
        );
        setView("mb:Sent");
        setActiveId(id);
        show("Message sent.", { icon: <FileEdit className="size-4" /> });
      } catch (error) {
        setComposeDrafts((prev) =>
          prev[id] ? { ...prev, [id]: { ...prev[id]!, sending: false } } : prev,
        );
        const message = error instanceof Error ? error.message : "Could not send message.";
        show(message, { icon: <X className="size-4" />, severity: "error" });
      }
    },
    [composeDrafts, operations, show, encodeFolderToken, closeComposeDialog, L.noSubject],
  );

  const discardComposeDraft = useCallback(
    async (id: string) => {
      const message = mail.find((candidate) => candidate.id === id);
      const shouldAttemptRemoteDelete =
        !!message &&
        !message.id.startsWith("m-") &&
        !!operations &&
        Number.isFinite(message.uid) &&
        message.uid > 0;
      if (shouldAttemptRemoteDelete) {
        try {
          await operations.deleteMessages([{ folder: message.folder, uid: message.uid }]);
        } catch {
          show("Discarded locally. Could not delete this draft on server.", {
            icon: <X className="size-4" />,
            severity: "warning",
          });
        }
      }
      setComposeDrafts((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
      delete composeBaselineRef.current[id];
      setMail((prev) => prev.filter((message) => message.id !== id));
      setSelectedIds((prev) => prev.filter((selectedId) => selectedId !== id));
      setActiveId((current) => (current === id ? "" : current));
      closeComposeDialog();
      show("Draft discarded and removed from your list.", {
        icon: <X className="size-4" />,
        severity: "info",
      });
    },
    [mail, operations, show, setSelectedIds, closeComposeDialog],
  );

  const requestCloseComposeDialog = useCallback(
    (id: string) => {
      const draft = composeDrafts[id];
      if (!draft) {
        closeComposeDialog();
        return;
      }
      const baseline = composeBaselineRef.current[id];
      const dirty = baseline ? isComposeDraftDirty(draft, baseline) : composeDraftHasContent(draft);
      if (!dirty) {
        closeComposeDialog();
        return;
      }
      requestConfirm({
        title: L.composeCloseTitle,
        description: L.composeCloseDescription,
        cancelLabel: L.composeKeepEditing,
        confirmLabel: L.composeCloseConfirm,
        onConfirm: closeComposeDialog,
      });
    },
    [
      composeDrafts,
      closeComposeDialog,
      requestConfirm,
      L.composeCloseTitle,
      L.composeCloseDescription,
      L.composeKeepEditing,
      L.composeCloseConfirm,
    ],
  );

  const requestDiscardComposeDraft = useCallback(
    (id: string) => {
      const draft = composeDrafts[id];
      if (!draft || !composeDraftHasContent(draft)) {
        void discardComposeDraft(id);
        return;
      }
      requestConfirm({
        title: L.composeDiscardTitle,
        description: L.composeDiscardDescription,
        variant: "destructive",
        cancelLabel: L.dialogCancel,
        confirmLabel: L.composeDeleteDraft,
        onConfirm: () => {
          void discardComposeDraft(id);
        },
      });
    },
    [
      composeDrafts,
      discardComposeDraft,
      requestConfirm,
      L.composeDiscardTitle,
      L.composeDiscardDescription,
      L.dialogCancel,
      L.composeDeleteDraft,
    ],
  );

  const selectView = useCallback((v: string) => {
    setView(v);
    workspaceLayoutRef.current?.closeMobileDetail();
    if (typeof window !== "undefined" && window.matchMedia("(max-width: 767px)").matches) {
      workspaceLayoutRef.current?.closeSidebar();
    }
  }, []);

  const mailboxView = useCallback((mailbox: string) => `mb:${mailbox}`, []);

  const moveMailboxOptions = useMemo(
    () => buildMoveMailboxOptions(allSystemMailboxes, moreMailboxes),
    [allSystemMailboxes, moreMailboxes],
  );
  const moveDialogCurrentMailbox = useMemo(
    () =>
      resolveMoveDialogCurrentMailbox({
        moveDialog,
        view,
        mail,
        moveMailboxOptions,
        encodeFolderToken,
      }),
    [moveDialog, view, mail, moveMailboxOptions, encodeFolderToken],
  );

  const { selectionBarButtons, selectionBar } = useMailSelectionBar({
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
    labels: {
      selectionMoveToMailbox: L.selectionMoveToMailbox,
      selectionMarkUnread: L.selectionMarkUnread,
      selectionStar: L.selectionStar,
      selectionArchive: L.selectionArchive,
      toolbarRestore: L.toolbarRestore,
      selectionDone: L.selectionDone,
    },
  });

  const handleMailItemDoubleClick = useCallback(
    (id: string, e: ReactMouseEvent) => {
      handleSelect(id, e);
      openDraftInComposer(id);
    },
    [handleSelect, openDraftInComposer],
  );

  const downloadAttachment = useCallback(
    async (attachment: MailAttachment) => {
      if (!active) return;
      try {
        const blob = operations
          ? await operations.downloadAttachment(
              { folder: active.folder, uid: active.uid },
              attachment,
            )
          : null;
        if (!blob) {
          show(`Cannot download "${attachment.name}" because no backend is connected.`, {
            icon: <FileEdit className="size-4" />,
          });
          return;
        }
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.download = attachment.name;
        document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      } catch {
        show(`Failed to download "${attachment.name}".`, {
          icon: <FileEdit className="size-4" />,
        });
      }
    },
    [active, operations, show],
  );

  return {
    L,
    allSystemMailboxes,
    secondarySystemMailboxes,
    moreMailboxes,
    mail,
    active,
    activeId,
    starred: effectiveStarred,
    view,
    viewLabel,
    moveDialog,
    moveMailboxOptions,
    moveDialogCurrentMailbox,
    searchQuery,
    searchInputRef,
    listEndRef,
    workspaceLayoutRef,
    confirmDialog,
    consumeParentDismissSuppression,
    isTouch,
    inTrash,
    isItemDragging,
    itemDragHandlers,
    sidebarDropZoneProps,
    selectedIds,
    selectionMode,
    handleSelect,
    handleMailItemDoubleClick,
    enterSelectionFor,
    setMoveDialog,
    setSearchQuery,
    effectiveListLoading,
    visibleMail,
    isLoadingMore,
    selectionBar,
    selectionBarButtons,
    mailboxView,
    selectView,
    compose,
    reply,
    replyAll,
    forward,
    openDraftInComposer,
    composeDialogId,
    closeComposeDialog,
    requestCloseComposeDialog,
    composeDrafts,
    updateComposeDraft,
    saveComposeDraft,
    sendComposeDraft,
    discardComposeDraft,
    requestDiscardComposeDraft,
    toggleStar,
    moveOne,
    toggleArchiveForMessage,
    toggleTrashForMessage,
    moveToMailbox,
    markRead,
    markUnread,
    sidebarUnreadBadge,
    show,
    downloadAttachment,
  };
}
