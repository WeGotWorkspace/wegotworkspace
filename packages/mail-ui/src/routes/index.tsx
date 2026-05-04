import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { MailRail } from "@/components/mail/MailRail";
import { MessageList } from "@/components/mail/MessageList";
import { MessageReader } from "@/components/mail/MessageReader";
import { Composer, type DraftSeed } from "@/components/mail/Composer";
import { mailDownloadAttachment, splitMessageId } from "@/lib/mail-api";
import { draftSeedFromMessage } from "@/lib/draft-from-message";
import { replyComposeRecipients } from "@/lib/reply-recipients";
import { useMail, type Attachment } from "@/lib/use-mail";
import { messagesVisibleInFolderList, neighborMessageIdAfterRemove } from "@/lib/mail-message-list";
import { Toaster } from "@/components/ui/sonner";

export const Route = createFileRoute("/")({
  component: MailApp,
  head: () => ({
    meta: [
      { title: "Mail - WeGotWorkspace" },
      {
        name: "description",
        content:
          "Read, write, and organize email with a thoughtful editorial interface. Works with any IMAP server.",
      },
      { property: "og:title", content: "Inkmail" },
      {
        property: "og:description",
        content: "A quiet, modern webmail client for any IMAP server.",
      },
    ],
  }),
});

function MailApp() {
  const [selectedFolder, setSelectedFolder] = useState<string>("inbox");
  const [selectedMessageId, setSelectedMessageId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [inboxUnreadOnly, setInboxUnreadOnly] = useState(false);
  const mail = useMail(selectedFolder, 0, query, inboxUnreadOnly);
  const [composerOpen, setComposerOpen] = useState(false);
  const [draftSeed, setDraftSeed] = useState<DraftSeed | undefined>();

  useEffect(() => {
    if (mail.mode === "needs_setup" && !mail.accountConfigured) {
      const m = window.location.pathname.match(/^(.*)\/mail(?:\/.*)?$/);
      const base = m ? m[1] : "";
      const next = `${base}/settings/mail/`.replace(/\/+/g, "/");
      window.location.assign(next.startsWith("/") ? next : `/${next}`);
    }
  }, [mail.mode, mail.accountConfigured]);

  useEffect(() => {
    if (mail.mode === "imap" && mail.inboxFolderId && selectedFolder === "inbox") {
      setSelectedFolder(mail.inboxFolderId);
    }
  }, [mail.mode, mail.inboxFolderId, selectedFolder]);

  const folder = mail.folders.find((f) => f.id === selectedFolder);

  const folderMessages = useMemo(() => {
    const list =
      selectedFolder === "starred" || selectedFolder === "__starred__"
        ? mail.messages.filter((m) => m.starred)
        : mail.messages.filter((m) => m.folderId === selectedFolder);
    return [...list].sort((a, b) => +new Date(b.date) - +new Date(a.date));
  }, [mail.messages, selectedFolder]);

  const serverSideSearch = mail.mode === "imap";
  const listUnreadOnly = folder?.system === "inbox" ? inboxUnreadOnly : false;
  const visibleListMessages = useMemo(
    () =>
      messagesVisibleInFolderList({
        messages: folderMessages,
        selectedId: selectedMessageId,
        query,
        unreadOnly: listUnreadOnly,
        serverSideSearch,
      }),
    [folderMessages, selectedMessageId, query, listUnreadOnly, serverSideSearch],
  );

  const selectedMessage = mail.messages.find((m) => m.id === selectedMessageId);

  const onDownloadAttachment = useMemo(() => {
    if (mail.mode !== "imap" || !selectedMessage) return undefined;
    const sp = splitMessageId(selectedMessage.id);
    if (!sp) return undefined;
    return async (att: Attachment) => {
      if (!att.part) return;
      await mailDownloadAttachment(sp.folderEnc, sp.uid, att.part, att.name || "attachment");
    };
  }, [mail.mode, selectedMessage]);

  const handleSelectFolder = (id: string) => {
    setSelectedFolder(id);
    setSelectedMessageId(null);
    setQuery("");
    setInboxUnreadOnly(false);
  };

  useEffect(() => {
    if (!inboxUnreadOnly || !selectedMessageId) return;
    const m = mail.messages.find((x) => x.id === selectedMessageId);
    if (!m) setSelectedMessageId(null);
  }, [inboxUnreadOnly, selectedMessageId, mail.messages]);

  const handleSelectMessage = (id: string) => {
    setSelectedMessageId(id);
    void mail.markRead(id, true);
    if (mail.mode === "imap") {
      void mail.fetchFullMessageBody(id);
    }
  };

  const openCompose = (seed?: DraftSeed) => {
    setDraftSeed(seed);
    setComposerOpen(true);
  };

  const reply = (all: boolean) => {
    if (!selectedMessage) return;
    const { to, cc } = replyComposeRecipients(selectedMessage, all, mail.identity.email);
    openCompose({
      to,
      cc,
      subject: selectedMessage.subject.startsWith("Re:")
        ? selectedMessage.subject
        : `Re: ${selectedMessage.subject}`,
      body: `\n\n— On ${new Date(selectedMessage.date).toLocaleString()}, ${selectedMessage.from.name} wrote:\n${selectedMessage.body
        .split("\n")
        .map((l) => `> ${l}`)
        .join("\n")}`,
    });
  };

  const forward = () => {
    if (!selectedMessage) return;
    openCompose({
      subject: selectedMessage.subject.startsWith("Fwd:")
        ? selectedMessage.subject
        : `Fwd: ${selectedMessage.subject}`,
      body: `\n\n---------- Forwarded message ----------\nFrom: ${selectedMessage.from.name} <${selectedMessage.from.email}>\nDate: ${new Date(selectedMessage.date).toLocaleString()}\nSubject: ${selectedMessage.subject}\n\n${selectedMessage.body}`,
    });
  };

  const editDraft = () => {
    if (!selectedMessage) return;
    openCompose(draftSeedFromMessage(selectedMessage));
  };

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background">
      <Toaster />
      {mail.mode === "loading" && (
        <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
          Loading mail…
        </div>
      )}
      {mail.mode !== "loading" && (
        <>
          {mail.imapError && (
            <div className="absolute left-0 right-0 top-0 z-40 border-b border-amber-200 bg-amber-50 px-4 py-2 text-center text-xs text-amber-950">
              {mail.imapError}
            </div>
          )}
          <MailRail
            selected={selectedFolder}
            onSelect={handleSelectFolder}
            onCompose={() => openCompose()}
            composeDisabled={mail.mode !== "imap"}
            folders={mail.folders}
            messages={mail.messages}
            createFolder={mail.createFolder}
            renameFolder={mail.renameFolder}
            deleteFolder={mail.deleteFolder}
          />
          <MessageList
            folder={folder}
            messages={folderMessages}
            selectedId={selectedMessageId}
            onSelect={handleSelectMessage}
            onToggleStar={(id) => void mail.toggleStar(id)}
            query={query}
            onQueryChange={setQuery}
            serverSideSearch={mail.mode === "imap"}
            loadingMessages={mail.mode === "imap" && mail.folderMessagesLoading}
            hasMore={mail.mode === "imap" && mail.messagesHasMore}
            loadingMore={mail.mode === "imap" && mail.messagesLoadingMore}
            onLoadMore={mail.mode === "imap" ? () => void mail.loadMoreMessages() : undefined}
            unreadOnly={folder?.system === "inbox" ? inboxUnreadOnly : false}
            onUnreadOnlyChange={folder?.system === "inbox" ? setInboxUnreadOnly : undefined}
            mailboxToolbar={
              mail.mode === "imap" && folder && !folder.virtual
                ? {
                    folders: mail.folders,
                    canDeleteMailbox: !folder.system,
                    onMoveMailbox: (parentId) => mail.moveFolder(folder.id, parentId),
                    onDeleteMailbox: async () => {
                      if (folder.system) return false;
                      const ok = await mail.deleteFolder(folder.id);
                      if (ok) {
                        setSelectedFolder(mail.inboxFolderId ?? "inbox");
                        setSelectedMessageId(null);
                      }
                      return ok;
                    },
                    onMailboxMoved: (newId) => {
                      setSelectedFolder(newId);
                    },
                  }
                : undefined
            }
          />
          <MessageReader
            message={selectedMessage}
            folders={mail.folders}
            currentFolderSystem={folder?.system ?? null}
            onMarkUnread={() => selectedMessage && void mail.markRead(selectedMessage.id, false)}
            onReply={() => reply(false)}
            onReplyAll={() => reply(true)}
            onForward={forward}
            onEditDraft={mail.mode === "imap" ? editDraft : undefined}
            onDelete={async () => {
              if (!selectedMessage) return;
              const removedId = selectedMessage.id;
              if (mail.mode !== "imap") {
                void mail.deleteMessage(removedId);
                return;
              }
              const nextId = neighborMessageIdAfterRemove(
                visibleListMessages.map((m) => m.id),
                removedId,
              );
              try {
                await mail.deleteMessage(removedId);
                if (nextId) handleSelectMessage(nextId);
                else setSelectedMessageId(null);
              } catch {
                /* keep selection */
              }
            }}
            onArchive={async () => {
              if (!selectedMessage) return;
              const removedId = selectedMessage.id;
              if (mail.mode !== "imap") {
                void mail.moveMessage(removedId, "archive");
                return;
              }
              const nextId = neighborMessageIdAfterRemove(
                visibleListMessages.map((m) => m.id),
                removedId,
              );
              try {
                await mail.moveMessage(removedId, "archive");
                if (nextId) handleSelectMessage(nextId);
                else setSelectedMessageId(null);
              } catch {
                /* keep selection */
              }
            }}
            onMoveTo={async (folderId) => {
              if (!selectedMessage) return;
              const removedId = selectedMessage.id;
              if (mail.mode !== "imap") {
                void mail.moveMessage(removedId, folderId);
                return;
              }
              const nextId = neighborMessageIdAfterRemove(
                visibleListMessages.map((m) => m.id),
                removedId,
              );
              try {
                await mail.moveMessage(removedId, folderId);
                if (nextId) handleSelectMessage(nextId);
                else setSelectedMessageId(null);
              } catch {
                /* keep selection */
              }
            }}
            onToggleStar={() => selectedMessage && void mail.toggleStar(selectedMessage.id)}
            imagePrivacyGate={mail.mode === "imap"}
            onResolveInlineImages={
              selectedMessageId
                ? async () => {
                    await mail.fetchFullMessageBody(selectedMessageId, { inlineImages: true });
                  }
                : undefined
            }
            onDownloadAttachment={onDownloadAttachment}
          />
          <Composer
            open={composerOpen}
            onOpenChange={setComposerOpen}
            seed={draftSeed}
            onSend={async (msg) => {
              await mail.saveMessage({ ...msg, folderId: "sent" });
            }}
            onSaveDraft={async (msg) => {
              await mail.saveMessage({ ...msg, folderId: "drafts" });
            }}
            fromIdentity={mail.identity}
          />
        </>
      )}
    </div>
  );
}
