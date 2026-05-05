import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Loader2, Paperclip, Search, Star, User, FolderInput, Trash2, Menu } from "lucide-react";
import { Input } from "@wgw/ui";
import { ToggleGroup, ToggleGroupItem } from "@wgw/ui";
import { Button } from "@wgw/ui";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@wgw/ui";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@wgw/ui";
import { MailboxFolderSelect } from "@/components/mail/MailboxFolderSelect";
import type { Folder, Message } from "@/lib/use-mail";
import { stripHtmlForPreview } from "@/lib/mail-html";
import { messagesVisibleInFolderList } from "@/lib/mail-message-list";
import { MAILBOX_PICKER_ROOT, folderSubtreeIds } from "@/lib/mail-folder-picker";

function fmtDate(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  if (d.getFullYear() !== now.getFullYear()) {
    return d.toLocaleDateString([], { dateStyle: "medium" });
  }
  const sameDay = d.toDateString() === now.toDateString();
  if (sameDay) return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const diff = (now.getTime() - d.getTime()) / 86400000;
  if (diff < 7) return d.toLocaleDateString([], { weekday: "short" });
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
}

export function MessageList({
  folder,
  messages,
  selectedId,
  onSelect,
  onToggleStar,
  query,
  onQueryChange,
  loadingMessages = false,
  hasMore = false,
  loadingMore = false,
  onLoadMore,
  unreadOnly = false,
  onUnreadOnlyChange,
  /** When true, search and unread-only are server-side (IMAP); list is not filtered locally for those. */
  serverSideSearch = false,
  mailboxToolbar,
  onOpenRail,
}: {
  folder: Folder | undefined;
  messages: Message[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onToggleStar: (id: string) => void;
  query: string;
  onQueryChange: (v: string) => void;
  /** IMAP: mailbox list is loaded but messages for this mailbox are still being fetched */
  loadingMessages?: boolean;
  /** IMAP: more rows available for infinite scroll */
  hasMore?: boolean;
  loadingMore?: boolean;
  onLoadMore?: () => void;
  /** Inbox: show only unread messages */
  unreadOnly?: boolean;
  onUnreadOnlyChange?: (next: boolean) => void;
  serverSideSearch?: boolean;
  /** When set, show move/delete mailbox actions (IMAP). System folders show disabled controls. */
  mailboxToolbar?: {
    folders: Folder[];
    /** When true, delete is allowed (custom / non-standard mailbox). */
    canDeleteMailbox: boolean;
    onMoveMailbox: (parentId: string | null) => Promise<string | null>;
    onDeleteMailbox: () => Promise<boolean>;
    onMailboxMoved?: (newFolderId: string) => void;
  };
  /** Small screens: open the folder rail overlay. */
  onOpenRail?: () => void;
}) {
  const [moveOpen, setMoveOpen] = useState(false);
  const [moveTarget, setMoveTarget] = useState<string>("");
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deletePending, setDeletePending] = useState(false);

  const filtered = useMemo(
    () =>
      messagesVisibleInFolderList({
        messages,
        selectedId,
        query,
        unreadOnly,
        serverSideSearch,
      }),
    [messages, query, unreadOnly, serverSideSearch, selectedId],
  );

  const emptyHint = useMemo(() => {
    if (loadingMessages) return "";
    const q = query.trim();
    if (messages.length === 0) {
      if (unreadOnly && serverSideSearch) {
        return q ? "No matching messages." : "No unread messages.";
      }
      return q ? "No matching messages." : "No messages here.";
    }
    if (
      unreadOnly &&
      !serverSideSearch &&
      filtered.length === 0 &&
      !messages.some((m) => !m.read)
    ) {
      return "No unread messages.";
    }
    if (q && filtered.length === 0) return "No matching messages.";
    return "No messages here.";
  }, [loadingMessages, messages, query, unreadOnly, filtered, serverSideSearch]);

  const excludeMoveParents = useMemo(() => {
    if (!mailboxToolbar || !folder?.id) return [];
    return folderSubtreeIds(mailboxToolbar.folders, folder.id);
  }, [mailboxToolbar, folder?.id]);

  const openMoveDialog = useCallback(() => {
    if (!folder) return;
    setMoveTarget(folder.parentId ?? MAILBOX_PICKER_ROOT);
    setMoveOpen(true);
  }, [folder]);

  useEffect(() => {
    setMoveOpen(false);
    setDeleteConfirmOpen(false);
  }, [folder?.id]);

  const listRef = useRef<HTMLUListElement>(null);
  const onScroll = useCallback(() => {
    if (!hasMore || !onLoadMore || loadingMessages || loadingMore) return;
    const el = listRef.current;
    if (!el) return;
    if (el.scrollHeight - el.scrollTop - el.clientHeight < 200) {
      onLoadMore();
    }
  }, [hasMore, onLoadMore, loadingMessages, loadingMore]);

  return (
    <div className="flex h-full w-full md:max-w-sm xl:max-w-md flex-col border-r border-border bg-card">
      <div className="border-b border-border px-5 pt-6 pb-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex flex-1 items-center gap-2">
            {onOpenRail && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="lg:hidden h-8 w-8 shrink-0"
                onClick={onOpenRail}
                aria-label="Open folders navigation"
              >
                <Menu className="h-4 w-4" />
              </Button>
            )}
            <h1 className="min-w-0 flex-1 truncate font-display text-3xl font-semibold tracking-tight">
              {folder?.name ?? "Inbox"}
            </h1>
          </div>
          {mailboxToolbar && folder && !folder.virtual ? (
            <div className="flex shrink-0 items-center gap-0.5 pt-0.5">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-foreground"
                aria-label="Move mailbox"
                title={folder.system ? "Standard mailboxes cannot be moved" : "Move mailbox"}
                onClick={openMoveDialog}
                disabled={Boolean(folder.system)}
              >
                <FolderInput className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-foreground"
                aria-label="Delete mailbox"
                title={
                  mailboxToolbar.canDeleteMailbox ? "Delete mailbox" : "Standard mailboxes cannot be deleted"
                }
                onClick={() => setDeleteConfirmOpen(true)}
                disabled={!mailboxToolbar.canDeleteMailbox}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ) : null}
        </div>

        <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete this mailbox?</AlertDialogTitle>
              <AlertDialogDescription>
                {folder?.name ? (
                  <>
                    <span className="font-medium text-foreground">“{folder.name}”</span> will be removed from the
                    server. Messages in this mailbox may be permanently deleted. This cannot be undone.
                  </>
                ) : (
                  "This mailbox will be removed from the server. Messages in it may be permanently deleted. This cannot be undone."
                )}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={deletePending}>Cancel</AlertDialogCancel>
              <Button
                type="button"
                variant="destructive"
                disabled={deletePending}
                onClick={() => {
                  if (!mailboxToolbar) return;
                  void (async () => {
                    setDeletePending(true);
                    try {
                      const ok = await mailboxToolbar.onDeleteMailbox();
                      if (ok) setDeleteConfirmOpen(false);
                    } finally {
                      setDeletePending(false);
                    }
                  })();
                }}
              >
                {deletePending ? "Deleting…" : "Delete mailbox"}
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <Dialog open={moveOpen} onOpenChange={setMoveOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Move mailbox</DialogTitle>
              <DialogDescription>Choose where this mailbox should appear in the hierarchy.</DialogDescription>
            </DialogHeader>
            {mailboxToolbar && folder && !folder.system ? (
              <>
                <div className="grid gap-2">
                  <MailboxFolderSelect
                    folders={mailboxToolbar.folders}
                    value={moveTarget}
                    onValueChange={setMoveTarget}
                    includeTopLevel
                    topLevelLabel="Top level"
                    excludeFolderIds={excludeMoveParents}
                    placeholder="Choose location…"
                  />
                </div>
                <DialogFooter>
                  <Button type="button" variant="secondary" onClick={() => setMoveOpen(false)}>
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    disabled={!moveTarget}
                    onClick={() => {
                      if (!mailboxToolbar || !folder) return;
                      const parentId = moveTarget === MAILBOX_PICKER_ROOT ? null : moveTarget;
                      void (async () => {
                        const newId = await mailboxToolbar.onMoveMailbox(parentId);
                        setMoveOpen(false);
                        if (newId) mailboxToolbar.onMailboxMoved?.(newId);
                      })();
                    }}
                  >
                    Move
                  </Button>
                </DialogFooter>
              </>
            ) : null}
          </DialogContent>
        </Dialog>

        {folder?.system === "inbox" && onUnreadOnlyChange && (
          <ToggleGroup
            type="single"
            value={unreadOnly ? "unread" : "all"}
            onValueChange={(v) => {
              if (v === "unread") onUnreadOnlyChange(true);
              else if (v === "all") onUnreadOnlyChange(false);
            }}
            variant="default"
            size="sm"
            className="mt-3 grid w-full grid-cols-2 gap-0.5 rounded-lg bg-muted/50 p-0.5"
          >
            <ToggleGroupItem
              value="all"
              className="h-8 flex-1 rounded-md border-0 text-xs shadow-none data-[state=on]:bg-background data-[state=on]:text-foreground data-[state=on]:shadow-sm data-[state=off]:text-muted-foreground"
            >
              All
            </ToggleGroupItem>
            <ToggleGroupItem
              value="unread"
              className="h-8 flex-1 rounded-md border-0 text-xs shadow-none data-[state=on]:bg-background data-[state=on]:text-foreground data-[state=on]:shadow-sm data-[state=off]:text-muted-foreground"
            >
              Unread
            </ToggleGroupItem>
          </ToggleGroup>
        )}
        <div className="relative mt-4">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder="Search this mailbox…"
            className="h-9 border-border/70 bg-background pl-9 text-sm"
          />
        </div>
      </div>

      <ul ref={listRef} onScroll={onScroll} className="flex-1 overflow-y-auto">
        {loadingMessages && (
          <li
            className="flex items-center justify-center px-6 py-16 text-muted-foreground"
            aria-busy="true"
            aria-live="polite"
          >
            <Loader2 className="h-8 w-8 animate-spin" aria-hidden />
            <span className="sr-only">Loading messages…</span>
          </li>
        )}
        {!loadingMessages && filtered.length === 0 && (
          <li className="px-6 py-12 text-center text-sm text-muted-foreground">{emptyHint}</li>
        )}
        {!loadingMessages &&
          filtered.map((m) => {
            const active = m.id === selectedId;
            return (
              <li key={m.id}>
                <button
                  onClick={() => onSelect(m.id)}
                  className={`group relative flex w-full gap-3 border-b border-border/60 px-5 py-4 text-left transition-colors ${
                    active ? "bg-saffron/10" : "hover:bg-secondary/60"
                  }`}
                >
                  {active && <span className="absolute inset-y-0 left-0 w-0.5 bg-saffron" />}
                  {!m.read && (
                    <span className="absolute left-2 top-6 h-1.5 w-1.5 rounded-full bg-saffron" />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex min-w-0 flex-1 items-center gap-0">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onToggleStar(m.id);
                          }}
                          className={`relative inline-flex h-7 w-7 shrink-0 items-center justify-center rounded transition-colors ${
                            m.starred
                              ? "text-saffron"
                              : "group/star-icon text-muted-foreground/55 hover:text-saffron"
                          }`}
                          aria-label={m.starred ? "Remove star" : "Star message"}
                        >
                          {m.starred ? (
                            <Star className="h-3.5 w-3.5" fill="currentColor" aria-hidden />
                          ) : (
                            <>
                              <User
                                className="h-3.5 w-3.5 transition-opacity duration-150 group-hover/star-icon:opacity-0"
                                strokeWidth={1.75}
                                aria-hidden
                              />
                              <Star
                                className="pointer-events-none absolute h-3.5 w-3.5 opacity-0 transition-opacity duration-150 group-hover/star-icon:opacity-100"
                                fill="none"
                                aria-hidden
                              />
                            </>
                          )}
                        </button>
                        <span
                          className={`min-w-0 truncate text-sm leading-snug ${m.read ? "text-foreground/80" : "font-semibold text-foreground"}`}
                        >
                          {m.from.name}
                        </span>
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-1.5 leading-none">
                        <span className="text-[11px] text-muted-foreground">{fmtDate(m.date)}</span>
                        {m.attachments.length > 0 ? (
                          <Paperclip
                            className="h-3.5 w-3.5 text-muted-foreground"
                            aria-label={`${m.attachments.length} attachment${m.attachments.length > 1 ? "s" : ""}`}
                          />
                        ) : null}
                      </div>
                    </div>
                    <div
                      className={`mt-0.5 truncate text-sm ${m.read ? "text-foreground/70" : "font-medium text-foreground"}`}
                    >
                      {m.subject}
                    </div>
                    <div className="mt-1 line-clamp-1 text-xs text-muted-foreground">
                      {stripHtmlForPreview(m.preview)}
                    </div>
                  </div>
                </button>
              </li>
            );
          })}
        {loadingMore && (
          <li className="flex justify-center border-t border-border/60 py-4 text-muted-foreground" aria-busy="true">
            <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
            <span className="sr-only">Loading more messages…</span>
          </li>
        )}
      </ul>
    </div>
  );
}
