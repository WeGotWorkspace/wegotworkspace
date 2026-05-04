import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { type Folder, type Message, type Attachment } from "./mail-store";
import * as api from "./mail-api";
import { splitMessageId } from "./mail-api";
import { MAILBOX_PICKER_ROOT } from "./mail-folder-picker";

const MAIL_PAGE_SIZE = 40;

function resolveApiFolderId(fid: string, fl: Folder[]): string {
  if (fid === "starred" || fid === "__starred__") return "__starred__";
  const by = (s: string) => fl.find((f) => f.system === s)?.id;
  const map: Record<string, string | undefined> = {
    inbox: by("inbox"),
    sent: by("sent"),
    drafts: by("drafts"),
    trash: by("trash"),
    spam: by("spam"),
    archive: by("archive"),
  };
  if (map[fid]) return map[fid] as string;
  return fid;
}

function setupHintFromStatus(s: api.MailStatus): string {
  if (!s.extImap) {
    return "PHP ext-imap is not enabled on the server.";
  }
  if (!s.serversConfigured) {
    return "Mail server hosts are not configured yet. An administrator must set IMAP and SMTP under Admin → Settings.";
  }
  if (!s.accountConfigured) {
    return "Save your IMAP username and password in User settings (/settings/mail) to load your mailbox.";
  }
  return "Mail is not ready to use yet.";
}

export function useMail(
  selectedFolder: string = "inbox",
  bootstrapGeneration = 0,
  mailboxListQuery = "",
  /** Inbox “Unread” tab: request {@code unseen=1} from the API (with optional {@code q}). */
  inboxUnreadOnlyForList = false,
) {
  const [mode, setMode] = useState<"loading" | "imap" | "needs_setup">("loading");
  const [imapError, setImapError] = useState<string | null>(null);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [folderMessagesLoading, setFolderMessagesLoading] = useState(false);
  const [messagesHasMore, setMessagesHasMore] = useState(false);
  const [messagesLoadingMore, setMessagesLoadingMore] = useState(false);
  const loadMoreLock = useRef(false);
  const [identity, setIdentity] = useState<{ displayName: string; email: string }>({
    displayName: "",
    email: "",
  });
  const [serversConfigured, setServersConfigured] = useState(false);
  const [accountConfigured, setAccountConfigured] = useState(false);
  const [extImap, setExtImap] = useState(false);
  const [ready, setReady] = useState(false);

  const resolveApiFolder = useCallback(
    (fid: string, fl: Folder[]) => resolveApiFolderId(fid, fl),
    [],
  );

  /** Keep rail badges in sync with local row state when server sent IMAP STATUS {@code unread}. */
  const adjustFolderUnread = useCallback((folderEnc: string, delta: number) => {
    if (delta === 0) return;
    setFolders((prev) =>
      prev.map((f) =>
        f.id === folderEnc && typeof f.unread === "number"
          ? { ...f, unread: Math.max(0, f.unread + delta) }
          : f,
      ),
    );
  }, []);

  useEffect(() => {
    setMode("loading");
    let cancelled = false;
    (async () => {
      try {
        const s = await api.mailStatus();
        if (cancelled) return;
        setServersConfigured(s.serversConfigured);
        setAccountConfigured(s.accountConfigured);
        setExtImap(s.extImap);
        setReady(s.ready);

        const applyConfigIdentity = async () => {
          try {
            const cfg = await api.mailConfigGet();
            if (cancelled) return;
            setIdentity({
              displayName: cfg.config.identity.displayName,
              email: cfg.config.identity.emailAddress,
            });
          } catch {
            if (!cancelled) {
              setIdentity({ displayName: "", email: "" });
            }
          }
        };

        if (s.ready) {
          try {
            const [{ folders: f }] = await Promise.all([api.mailFolders(), applyConfigIdentity()]);
            if (cancelled) return;
            setFolders(f as Folder[]);
            setMode("imap");
            setImapError(null);
          } catch (e) {
            if (cancelled) return;
            setMode("needs_setup");
            setFolders([]);
            setMessages([]);
            setImapError(e instanceof Error ? e.message : "Could not open the mailbox.");
            await applyConfigIdentity();
          }
        } else {
          if (cancelled) return;
          setMode("needs_setup");
          setFolders([]);
          setMessages([]);
          setImapError(setupHintFromStatus(s));
          await applyConfigIdentity();
        }
      } catch (e) {
        if (!cancelled) {
          setMode("needs_setup");
          setServersConfigured(false);
          setAccountConfigured(false);
          setExtImap(false);
          setReady(false);
          setFolders([]);
          setMessages([]);
          const detail = e instanceof Error ? e.message : "";
          setImapError(
            detail
              ? `${detail} Could not read mail status from the server.`
              : "Could not read mail status from the server.",
          );
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [bootstrapGeneration]);

  const apiFolder = useMemo(
    () => resolveApiFolder(selectedFolder, folders),
    [selectedFolder, folders, resolveApiFolder],
  );
  const apiFolderRef = useRef(apiFolder);
  apiFolderRef.current = apiFolder;

  const trimmedListQuery = mailboxListQuery.trim();
  const [debouncedListQuery, setDebouncedListQuery] = useState("");
  useEffect(() => {
    const delayMs = trimmedListQuery === "" ? 0 : 300;
    const id = window.setTimeout(() => setDebouncedListQuery(trimmedListQuery), delayMs);
    return () => window.clearTimeout(id);
  }, [trimmedListQuery]);

  const listUnseenOnly = useMemo(
    () =>
      inboxUnreadOnlyForList &&
      folders.some((f) => f.id === selectedFolder && f.system === "inbox"),
    [inboxUnreadOnlyForList, folders, selectedFolder],
  );

  const mergeAttachmentHints = useCallback(
    async (folderForApi: string, messageIds: string[]) => {
      if (mode !== "imap" || messageIds.length === 0) return;
      const folderSnap = folderForApi;
      try {
        const { items } = await api.mailMessageAttachmentHints(folderForApi, messageIds);
        if (apiFolderRef.current !== folderSnap) return;
        const map = new Map(items.map((it) => [it.id, it.attachments]));
        setMessages((prev) =>
          prev.map((row) => {
            const next = map.get(row.id);
            return next !== undefined ? { ...row, attachments: next } : row;
          }),
        );
      } catch {
        /* ignore — list is usable without paperclips */
      }
    },
    [mode],
  );

  useEffect(() => {
    if (mode !== "imap") {
      setFolderMessagesLoading(false);
      setMessagesHasMore(false);
      setMessagesLoadingMore(false);
      return;
    }
    let cancelled = false;
    setFolderMessagesLoading(true);
    setMessagesHasMore(false);
    setMessagesLoadingMore(false);
    setMessages([]);
    (async () => {
      try {
        const opts: { limit: number; offset: number; q?: string; unseen?: boolean } = {
          limit: MAIL_PAGE_SIZE,
          offset: 0,
        };
        if (debouncedListQuery !== "") opts.q = debouncedListQuery;
        if (listUnseenOnly) opts.unseen = true;
        const { messages: m, hasMore } = await api.mailMessages(apiFolder, opts);
        if (cancelled) return;
        setMessages(m as Message[]);
        setMessagesHasMore(Boolean(hasMore));
        void mergeAttachmentHints(
          apiFolder,
          (m as Message[]).map((row) => row.id),
        );
      } catch {
        if (!cancelled) {
          setMessages([]);
          setMessagesHasMore(false);
        }
      } finally {
        if (!cancelled) setFolderMessagesLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [mode, apiFolder, mergeAttachmentHints, debouncedListQuery, listUnseenOnly]);

  const loadMoreMessages = useCallback(async () => {
    if (mode !== "imap") return;
    if (!messagesHasMore || folderMessagesLoading || loadMoreLock.current) return;
    loadMoreLock.current = true;
    setMessagesLoadingMore(true);
    const folderForRequest = apiFolder;
    try {
      const offset = messages.length;
      const pageOpts: { limit: number; offset: number; q?: string; unseen?: boolean } = {
        limit: MAIL_PAGE_SIZE,
        offset,
      };
      if (debouncedListQuery !== "") pageOpts.q = debouncedListQuery;
      if (listUnseenOnly) pageOpts.unseen = true;
      const { messages: next, hasMore } = await api.mailMessages(folderForRequest, pageOpts);
      if (folderForRequest !== apiFolderRef.current) {
        return;
      }
      const appended: Message[] = [];
      setMessages((prev) => {
        const seen = new Set(prev.map((x) => x.id));
        const merged = [...prev];
        for (const row of next as Message[]) {
          if (!seen.has(row.id)) {
            seen.add(row.id);
            merged.push(row);
            appended.push(row);
          }
        }
        return merged;
      });
      setMessagesHasMore(Boolean(hasMore));
      if (appended.length > 0) {
        void mergeAttachmentHints(
          folderForRequest,
          appended.map((r) => r.id),
        );
      }
    } catch {
      setMessagesHasMore(false);
    } finally {
      loadMoreLock.current = false;
      setMessagesLoadingMore(false);
    }
  }, [
    mode,
    apiFolder,
    messagesHasMore,
    folderMessagesLoading,
    messages.length,
    mergeAttachmentHints,
    debouncedListQuery,
    listUnseenOnly,
  ]);

  const findMessage = useCallback((id: string) => messages.find((x) => x.id === id), [messages]);

  const createFolder = useCallback(
    async (name: string, parentId: string | null) => {
      if (mode !== "imap") return;
      const parentMb =
        parentId && parentId !== "__starred__"
          ? folders.find((f) => f.id === parentId)?.id
          : undefined;
      try {
        await api.mailFolderCreate({ name, parentMailbox: parentMb });
        const { folders: f } = await api.mailFolders();
        setFolders(f as Folder[]);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Could not create mailbox");
      }
    },
    [mode, folders],
  );

  const renameFolder = useCallback(
    async (_id: string, _name: string) => {
      if (mode !== "imap") return;
    },
    [mode],
  );

  const deleteFolder = useCallback(
    async (id: string): Promise<boolean> => {
      if (mode !== "imap") {
        return false;
      }
      if (id === "__starred__") return false;
      try {
        await api.mailFolderDelete(id);
        const { folders: f } = await api.mailFolders();
        setFolders(f as Folder[]);
        return true;
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Could not delete mailbox");
        return false;
      }
    },
    [mode],
  );

  const moveFolder = useCallback(
    async (folderId: string, parentId: string | null) => {
      if (mode !== "imap") return null;
      try {
        const parentEnc =
          parentId && parentId !== "__starred__" && parentId !== MAILBOX_PICKER_ROOT
            ? parentId
            : "";
        const res = await api.mailFolderMove({
          folder: folderId,
          parentMailbox: parentEnc,
        });
        const { folders: f } = await api.mailFolders();
        setFolders(f as Folder[]);
        return res.id;
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Could not move mailbox");
        return null;
      }
    },
    [mode],
  );

  const markRead = useCallback(
    async (id: string, read = true) => {
      if (mode !== "imap") return;
      const sp = splitMessageId(id);
      if (!sp) return;
      const m = messages.find((x) => x.id === id);
      const wasUnread = m ? !m.read : false;
      await api.mailPatchMessage({ folder: sp.folderEnc, uid: sp.uid, read });
      setMessages((prev) => prev.map((x) => (x.id === id ? { ...x, read } : x)));
      const delta = wasUnread && read ? -1 : !wasUnread && !read ? 1 : 0;
      adjustFolderUnread(sp.folderEnc, delta);
    },
    [mode, messages, adjustFolderUnread],
  );

  const toggleStar = useCallback(
    async (id: string) => {
      if (mode !== "imap") return;
      const m = findMessage(id);
      const sp = splitMessageId(id);
      if (!sp) return;
      const next = !m?.starred;
      await api.mailPatchMessage({ folder: sp.folderEnc, uid: sp.uid, starred: next });
      setMessages((prev) => prev.map((x) => (x.id === id ? { ...x, starred: next } : x)));
    },
    [mode, findMessage],
  );

  const moveMessage = useCallback(
    async (id: string, folderId: string) => {
      if (mode !== "imap") return;
      const sp = splitMessageId(id);
      if (!sp) return;
      const m = messages.find((x) => x.id === id);
      const wasUnread = m ? !m.read : false;
      const toEnc = resolveApiFolder(folderId, folders);
      await api.mailMove({ fromFolder: sp.folderEnc, toFolder: toEnc, uid: sp.uid });
      setMessages((prev) => prev.filter((x) => x.id !== id));
      if (wasUnread) {
        adjustFolderUnread(sp.folderEnc, -1);
        adjustFolderUnread(toEnc, 1);
      }
    },
    [mode, folders, messages, resolveApiFolder, adjustFolderUnread],
  );

  const deleteMessage = useCallback(
    async (id: string) => {
      if (mode !== "imap") return;
      const sp = splitMessageId(id);
      if (!sp) return;
      const m = messages.find((x) => x.id === id);
      const wasUnread = m ? !m.read : false;
      const trash = folders.find((f) => f.system === "trash");
      // Some servers (or mailbox listings) don't expose a detectable Trash mailbox.
      // Backend can resolve system folders when given "trash".
      const toFolder = trash?.id ?? "trash";
      await api.mailMove({ fromFolder: sp.folderEnc, toFolder, uid: sp.uid });
      setMessages((prev) => prev.filter((x) => x.id !== id));
      if (wasUnread) {
        adjustFolderUnread(sp.folderEnc, -1);
        const toEnc = resolveApiFolder(toFolder, folders);
        adjustFolderUnread(toEnc, 1);
      }
    },
    [mode, folders, messages, resolveApiFolder, adjustFolderUnread],
  );

  const saveMessage = useCallback(
    async (draft: Omit<Message, "id" | "date" | "read" | "starred"> & { id?: string }) => {
      if (mode !== "imap") {
        return draft.id ?? "noop";
      }
      const attachments = draft.attachments
        .map((a) => {
          const raw = a.dataUrl;
          if (typeof raw !== "string" || !raw.includes(",")) return null;
          const contentBase64 = raw.split(",", 2)[1]?.trim() ?? "";
          if (!contentBase64) return null;
          return {
            filename: a.name,
            mimeType: a.type?.trim() || "application/octet-stream",
            contentBase64,
          };
        })
        .filter((x): x is NonNullable<typeof x> => x !== null);

      const refreshList = async () => {
        try {
          const opts: { limit: number; offset: number; q?: string; unseen?: boolean } = {
            limit: MAIL_PAGE_SIZE,
            offset: 0,
          };
          if (debouncedListQuery !== "") {
            opts.q = debouncedListQuery;
            if (listUnseenOnly) opts.unseen = true;
          }
          const { messages: m, hasMore } = await api.mailMessages(apiFolder, opts);
          setMessages(m as Message[]);
          setMessagesHasMore(Boolean(hasMore));
          void mergeAttachmentHints(
            apiFolder,
            (m as Message[]).map((row) => row.id),
          );
        } catch {
          /* ignore */
        }
      };

      if (draft.folderId === "sent") {
        const to = draft.to.map((t) => t.email).join(", ");
        const cc = draft.cc?.map((t) => t.email).join(", ") ?? "";
        const bcc = draft.bcc?.map((t) => t.email).join(", ") ?? "";
        const sendResp = await api.mailSend({
          to,
          cc,
          ...(bcc !== "" ? { bcc } : {}),
          subject: draft.subject,
          body: draft.body,
          ...(attachments.length > 0 ? { attachments } : {}),
        });
        if (attachments.length > 0) {
          const rep = sendResp.attachment_report;
          if (rep && rep.attached === 0) {
            throw new Error("Attachments were not included (server skipped them).");
          }
        }
        if (draft.id) {
          try {
            await deleteMessage(draft.id);
          } catch {
            /* send already succeeded; draft copy may remain until deleted manually */
          }
        }
        await refreshList();
        return "sent";
      }
      if (draft.folderId === "drafts") {
        const to = draft.to.map((t) => t.email).join(", ");
        const cc = draft.cc?.map((t) => t.email).join(", ") ?? "";
        const bcc = draft.bcc?.map((t) => t.email).join(", ") ?? "";
        const draftResp = await api.mailSaveDraft({
          to,
          cc,
          ...(bcc !== "" ? { bcc } : {}),
          subject: draft.subject,
          body: draft.body,
          ...(attachments.length > 0 ? { attachments } : {}),
        });
        if (attachments.length > 0) {
          const rep = draftResp.attachment_report;
          if (rep && rep.attached === 0) {
            throw new Error("Attachments were not included (server skipped them).");
          }
        }
        if (draft.id) {
          try {
            await deleteMessage(draft.id);
          } catch {
            /* new draft is saved; old copy may remain */
          }
        }
        await refreshList();
        return draft.id ?? "draft";
      }
      return draft.id ?? "draft";
    },
    [mode, apiFolder, mergeAttachmentHints, debouncedListQuery, listUnseenOnly, deleteMessage],
  );

  const fetchFullMessageBody = useCallback(
    async (id: string, opts?: { inlineImages?: boolean }) => {
      if (mode !== "imap") return;
      const sp = splitMessageId(id);
      if (!sp) return;
      const { message } = await api.mailMessage(sp.folderEnc, sp.uid, {
        inlineImages: opts?.inlineImages ?? false,
      });
      const bodyHtml =
        typeof message.bodyHtml === "string" && message.bodyHtml.trim() !== ""
          ? message.bodyHtml
          : undefined;
      setMessages((prev) =>
        prev.map((x) =>
          x.id === id
            ? {
                ...x,
                body: message.body,
                bodyHtml,
                to: message.to,
                cc: message.cc,
                attachments: message.attachments ?? x.attachments,
              }
            : x,
        ),
      );
    },
    [mode],
  );

  return {
    mode,
    imapError,
    folders,
    messages,
    folderMessagesLoading,
    messagesHasMore,
    messagesLoadingMore,
    loadMoreMessages,
    createFolder,
    renameFolder,
    deleteFolder,
    moveFolder,
    markRead,
    toggleStar,
    moveMessage,
    deleteMessage,
    saveMessage,
    fetchFullMessageBody,
    inboxFolderId: folders.find((f) => f.system === "inbox")?.id ?? null,
    identity,
    serversConfigured,
    accountConfigured,
    extImap,
    ready,
  };
}

export type { Folder, Message, Attachment };
