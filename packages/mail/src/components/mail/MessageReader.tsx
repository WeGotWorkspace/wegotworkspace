import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Reply,
  ReplyAll,
  Forward,
  Trash2,
  Archive,
  Star,
  Circle,
  Paperclip,
  Mail,
  ImageOff,
  FolderInput,
  PencilLine,
  ChevronLeft,
} from "lucide-react";
import { Button } from "@wgw/ui";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@wgw/ui";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@wgw/ui";
import { MailboxFolderSelect } from "@/components/mail/MailboxFolderSelect";
import { CalendarInviteCard } from "@/components/mail/CalendarInviteCard";
import type { Attachment, Folder, Message } from "@/lib/use-mail";
import {
  wrapEmailHtmlDocument,
  stripRemoteImageUrls,
  emailHtmlHasCidReferences,
  emailHtmlHasRemoteImageUrls,
} from "@/lib/mail-html";
import { extractVCalendarFromBody, parseCalendarInvite } from "@/lib/parse-ics-invite";
import { listMoveTargetFolders } from "@/lib/mail-folder-picker";

const MAIL_ALWAYS_SHOW_IMAGES_KEY = "sabre-mail:always-show-images";

function readMailAlwaysShowImages(): boolean {
  try {
    return typeof localStorage !== "undefined" && localStorage.getItem(MAIL_ALWAYS_SHOW_IMAGES_KEY) === "1";
  } catch {
    return false;
  }
}

function persistMailAlwaysShowImages(value: boolean) {
  try {
    if (typeof localStorage === "undefined") return;
    if (value) {
      localStorage.setItem(MAIL_ALWAYS_SHOW_IMAGES_KEY, "1");
    } else {
      localStorage.removeItem(MAIL_ALWAYS_SHOW_IMAGES_KEY);
    }
  } catch {
    /* ignore quota / private mode */
  }
}

function fmtFull(iso: string) {
  return new Date(iso).toLocaleString([], { dateStyle: "medium", timeStyle: "short" });
}

function initials(name: string) {
  return name.split(/\s+/).slice(0, 2).map((p) => p[0]).join("").toUpperCase();
}

/** One line per mailbox row: show name + angle-bracket email when a display name is present. */
function formatRecipientLine(t: { name?: string; email: string }): string {
  const e = t.email.trim();
  const n = t.name?.trim();
  if (!e) return n ?? "";
  if (!n || n === e) return e;
  return `${n} <${e}>`;
}

function EmailHtmlFrame({ html }: { html: string }) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const srcDoc = useMemo(() => wrapEmailHtmlDocument(html), [html]);

  const syncHeight = useCallback(() => {
    const el = iframeRef.current;
    if (!el) return;
    const doc = el.contentDocument;
    if (!doc?.body) return;
    const h = Math.max(doc.documentElement?.scrollHeight ?? 0, doc.body.scrollHeight ?? 0);
    el.style.height = `${Math.max(h + 24, 160)}px`;
  }, []);

  useEffect(() => {
    syncHeight();
  }, [srcDoc, syncHeight]);

  return (
    <iframe
      ref={iframeRef}
      title="HTML message"
      srcDoc={srcDoc}
      onLoad={syncHeight}
      className="mt-8 w-full rounded-md border border-border bg-card shadow-sm"
      sandbox="allow-same-origin allow-popups"
      referrerPolicy="no-referrer"
    />
  );
}

export function MessageReader({
  message,
  folders,
  currentFolderSystem,
  onMarkUnread,
  onReply,
  onReplyAll,
  onForward,
  onEditDraft,
  onDelete,
  onArchive,
  onMoveTo,
  onToggleStar,
  onBackToList,
  imagePrivacyGate = false,
  onResolveInlineImages,
  onDownloadAttachment,
}: {
  message: Message | undefined;
  folders: Folder[];
  currentFolderSystem?: Folder["system"] | null;
  onMarkUnread: () => void;
  onReply: () => void;
  onReplyAll: () => void;
  onForward: () => void;
  /** When set (e.g. in Drafts), opens the composer to continue editing this draft. */
  onEditDraft?: () => void;
  onDelete: () => void;
  onArchive: () => void;
  onMoveTo: (folderId: string) => void;
  onToggleStar: () => void;
  /** Small screens: return to the message list view. */
  onBackToList?: () => void;
  /** When true (IMAP), remote images are blocked and CID parts load only after the user opts in. */
  imagePrivacyGate?: boolean;
  /** Refetch message body with inline MIME images resolved (`inline_images=1`). */
  onResolveInlineImages?: () => Promise<void>;
  /** Download attachment by part id via authenticated API. */
  onDownloadAttachment?: (attachment: Attachment) => Promise<void>;
}) {
  const proseClass =
    "prose prose-sm mt-8 max-w-none whitespace-pre-wrap font-sans text-[15px] leading-relaxed text-foreground/90";

  const [alwaysShowImages, setAlwaysShowImages] = useState(readMailAlwaysShowImages);
  const [imagesUnlocked, setImagesUnlocked] = useState(false);
  const [inlineResolveLoading, setInlineResolveLoading] = useState(false);
  const [moveOpen, setMoveOpen] = useState(false);
  const [moveTarget, setMoveTarget] = useState<string>("");
  const autoCidFetchMessageIdRef = useRef<string | null>(null);

  const imagesEffectivelyUnlocked = alwaysShowImages || imagesUnlocked;

  useEffect(() => {
    setImagesUnlocked(false);
    setInlineResolveLoading(false);
    setMoveOpen(false);
    setMoveTarget("");
    autoCidFetchMessageIdRef.current = null;
  }, [message?.id]);

  const rawHtml = message?.bodyHtml?.trim() ?? "";

  const displayHtml = useMemo(() => {
    if (rawHtml === "") return "";
    if (!imagePrivacyGate || imagesEffectivelyUnlocked) {
      return rawHtml;
    }
    return stripRemoteImageUrls(rawHtml);
  }, [rawHtml, imagePrivacyGate, imagesEffectivelyUnlocked]);

  const showImageGateBanner =
    imagePrivacyGate &&
    rawHtml !== "" &&
    !imagesEffectivelyUnlocked &&
    (emailHtmlHasRemoteImageUrls(rawHtml) || emailHtmlHasCidReferences(rawHtml));

  const handleDisplayImages = useCallback(async () => {
    const html = message?.bodyHtml?.trim() ?? "";
    const hadCid = emailHtmlHasCidReferences(html);
    persistMailAlwaysShowImages(true);
    setAlwaysShowImages(true);
    setImagesUnlocked(true);
    if (hadCid && onResolveInlineImages) {
      setInlineResolveLoading(true);
      try {
        await onResolveInlineImages();
      } finally {
        setInlineResolveLoading(false);
      }
    }
  }, [message?.bodyHtml, onResolveInlineImages]);

  useEffect(() => {
    if (!imagePrivacyGate || !alwaysShowImages || !message?.id || !onResolveInlineImages) {
      return;
    }
    const html = message.bodyHtml?.trim() ?? "";
    if (!emailHtmlHasCidReferences(html)) {
      return;
    }
    if (autoCidFetchMessageIdRef.current === message.id) {
      return;
    }
    autoCidFetchMessageIdRef.current = message.id;
    void (async () => {
      setInlineResolveLoading(true);
      try {
        await onResolveInlineImages();
      } finally {
        setInlineResolveLoading(false);
      }
    })();
  }, [alwaysShowImages, imagePrivacyGate, message?.bodyHtml, message?.id, onResolveInlineImages]);

  const moveCandidates = useMemo(() => {
    if (!message) {
      return [];
    }
    return listMoveTargetFolders(folders, message.folderId);
  }, [folders, message?.folderId, message?.id]);

  const messageIsDraft = useMemo(
    () =>
      message != null && folders.find((f) => f.id === message.folderId)?.system === "drafts",
    [folders, message],
  );

  const calendarView = useMemo(() => {
    if (!message) {
      return null;
    }
    const html = message.bodyHtml?.trim() ?? "";
    if (html !== "") {
      return null;
    }
    const { preamble, calendar } = extractVCalendarFromBody(message.body ?? "");
    if (!calendar) {
      return null;
    }
    const invite = parseCalendarInvite(calendar);
    if (!invite) {
      return null;
    }
    return { preamble, invite, calendar };
  }, [message]);

  if (!message) {
    return (
      <div className="flex h-full min-h-0 flex-1 items-center justify-center bg-background">
        <div className="text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-secondary">
            <Mail className="h-6 w-6 text-muted-foreground" />
          </div>
          <p className="mt-4 font-display text-xl">Select a message</p>
        </div>
      </div>
    );
  }

  const deleteDisabled = currentFolderSystem === "trash";
  const archiveDisabled = currentFolderSystem === "archive";

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-y-auto bg-background">
      <div className="sticky top-0 z-10 flex shrink-0 items-center gap-1 border-b border-border bg-background px-3 py-3 sm:px-6">
        {onBackToList && (
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={onBackToList}
            aria-label="Back to message list"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
        )}
        {onEditDraft && messageIsDraft ? (
          <Button variant="default" size="sm" onClick={onEditDraft} className="bg-saffron text-ink hover:bg-saffron/90">
            <PencilLine className="mr-1.5 h-3.5 w-3.5" />
            Edit draft
          </Button>
        ) : (
          <>
            <Button variant="ghost" size="sm" onClick={onReply} className="px-2 sm:px-3" aria-label="Reply">
              <Reply className="h-3.5 w-3.5 xl:mr-1.5" />
              <span className="hidden xl:inline">Reply</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onReplyAll}
              className="px-2 sm:px-3"
              aria-label="Reply all"
            >
              <ReplyAll className="h-3.5 w-3.5 xl:mr-1.5" />
              <span className="hidden xl:inline">Reply all</span>
            </Button>
            <Button variant="ghost" size="sm" onClick={onForward} className="px-2 sm:px-3" aria-label="Forward">
              <Forward className="h-3.5 w-3.5 xl:mr-1.5" />
              <span className="hidden xl:inline">Forward</span>
            </Button>
          </>
        )}
        <div className="mx-1 h-5 w-px bg-border sm:mx-2" />
        <TooltipProvider delayDuration={150}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" onClick={onArchive} aria-label="Archive" disabled={archiveDisabled}>
                <Archive className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Archive</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" onClick={onDelete} aria-label="Delete" disabled={deleteDisabled}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Delete</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" onClick={onMarkUnread} aria-label="Mark unread" disabled={!message.read}>
                <Circle className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Mark unread</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" onClick={onToggleStar} aria-label="Star">
                <Star className="h-4 w-4" fill={message.starred ? "currentColor" : "none"} />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{message.starred ? "Unstar" : "Star"}</TooltipContent>
          </Tooltip>
        </TooltipProvider>
        <div className="mx-1 h-5 w-px bg-border sm:mx-2" />
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setMoveOpen(true)}
          disabled={moveCandidates.length === 0}
          className="px-2 sm:px-3"
          aria-label="Move to mailbox"
        >
          <FolderInput className="h-3.5 w-3.5 xl:mr-1.5" />
          <span className="hidden xl:inline">Move to…</span>
        </Button>
        <div className="flex-1" />
      </div>

      <Dialog open={moveOpen} onOpenChange={setMoveOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Move to mailbox</DialogTitle>
            <DialogDescription>Select a mailbox to move this message to.</DialogDescription>
          </DialogHeader>

          <div className="grid gap-2">
            <MailboxFolderSelect
              folders={folders}
              value={moveTarget}
              onValueChange={setMoveTarget}
              excludeFolderIds={[message.folderId]}
              placeholder="Choose a mailbox…"
            />
          </div>

          <DialogFooter>
            <Button
              variant="secondary"
              onClick={() => {
                setMoveOpen(false);
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (!moveTarget) return;
                onMoveTo(moveTarget);
                setMoveOpen(false);
              }}
              disabled={!moveTarget}
            >
              Move
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div>
        <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6 sm:py-8 md:px-10 md:py-10">
          <h1 className="font-display text-4xl font-semibold leading-tight tracking-tight text-foreground">
            {message.subject}
          </h1>

          <div className="mt-8 flex items-start gap-4 border-b border-border pb-6">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-saffron/20 font-display text-sm font-semibold text-foreground">
              {initials(message.from.name)}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <div>
                  <span className="font-medium text-foreground">{message.from.name}</span>
                  <span className="ml-2 text-sm text-muted-foreground">&lt;{message.from.email}&gt;</span>
                </div>
                <span className="text-xs text-muted-foreground">{fmtFull(message.date)}</span>
              </div>
              <div className="mt-1 space-y-0.5 text-xs text-muted-foreground">
                {message.to.length > 0 && (
                  <div className="wrap-break-word">
                    <span className="font-medium text-foreground/70">To </span>
                    {message.to.map(formatRecipientLine).join(", ")}
                  </div>
                )}
                {message.cc != null && message.cc.length > 0 && (
                  <div className="wrap-break-word">
                    <span className="font-medium text-foreground/70">Cc </span>
                    {message.cc.map(formatRecipientLine).join(", ")}
                  </div>
                )}
              </div>
            </div>
          </div>

          {message.bodyHtml && message.bodyHtml.trim() !== "" ? (
            <>
              {showImageGateBanner ? (
                <div className="mt-6 flex flex-col gap-3 rounded-lg border border-border bg-muted/30 px-4 py-3 sm:flex-row sm:items-center">
                  <div className="flex min-w-0 flex-1 gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-background text-muted-foreground shadow-sm">
                      <ImageOff className="h-4 w-4" aria-hidden />
                    </div>
                    <div className="min-w-0 text-sm leading-snug text-muted-foreground">
                      <p className="font-medium text-foreground">Images are hidden</p>
                      <p className="mt-0.5">
                        Remote images are not loaded, and embedded (CID) images load only when you ask. This limits
                        tracking and keeps the first load lighter.
                      </p>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    className="shrink-0 self-start sm:self-center"
                    disabled={inlineResolveLoading}
                    onClick={() => void handleDisplayImages()}
                  >
                    {inlineResolveLoading ? "Loading…" : "Display images"}
                  </Button>
                </div>
              ) : null}
              <EmailHtmlFrame html={displayHtml} />
            </>
          ) : calendarView ? (
            <>
              {calendarView.preamble ? (
                <article className={proseClass}>{calendarView.preamble}</article>
              ) : null}
              <CalendarInviteCard invite={calendarView.invite} rawIcs={calendarView.calendar} />
            </>
          ) : (
            <article className={proseClass}>{message.body}</article>
          )}

          {message.attachments.length > 0 && (
            <div className="mt-10 border-t border-border pt-6">
              <div className="mb-3 text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">
                {message.attachments.length} attachment{message.attachments.length > 1 ? "s" : ""}
              </div>
              <div className="flex flex-wrap gap-2">
                {message.attachments.map((a) => {
                  const pillClass =
                    "flex min-w-0 max-w-full items-center gap-2 rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground";
                  const label = (
                    <>
                      <Paperclip className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
                      <span className="min-w-0 truncate">{a.name}</span>
                      <span className="shrink-0 text-xs text-muted-foreground">{(a.size / 1024).toFixed(0)} KB</span>
                    </>
                  );
                  return onDownloadAttachment && a.part ? (
                    <button
                      type="button"
                      key={a.id}
                      onClick={() => void onDownloadAttachment(a)}
                      className={`${pillClass} transition-colors hover:bg-muted/60`}
                    >
                      {label}
                    </button>
                  ) : (
                    <div key={a.id} className={pillClass}>
                      {label}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
