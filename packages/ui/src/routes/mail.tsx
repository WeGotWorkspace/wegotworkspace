import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  Star,
  Archive,
  Trash2,
  Menu,
  ArrowLeft,
  X,
  LogOut,
  Search,
  PanelLeftClose,
  PanelLeftOpen,
  PenSquare,
  Reply,
  ReplyAll,
  Forward,
  FolderInput,
  ArchiveRestore,
  StarOff,
  Inbox as InboxIcon,
  Send,
  FileEdit,
  AlertOctagon,
  Trash,
  Mail as MailIcon,
  Folder,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  SwipeableList,
  Type as SwipeListType,
} from "react-swipeable-list";
import "react-swipeable-list/dist/styles.css";
import type { Note } from "@/types/note";
import { useIsTouch } from "@/hooks/use-is-touch";
import { NoteListItem } from "@/components/notes/note-list-item";
import { SidebarGroup, SidebarLink } from "@/components/notes/sidebar";
import { ListAction, ToolbarButton, FabButton } from "@/components/notes/action-buttons";
import { MoveToDialog } from "@/components/notes/dialogs";
import { AppSwitcher } from "@/components/app-switcher";

export const Route = createFileRoute("/mail")({
  component: MailApp,
  head: () => ({
    meta: [
      { title: "Mail" },
      { name: "description", content: "A calm inbox for focused correspondence." },
      { name: "theme-color", content: "#f2ce42" },
      { name: "apple-mobile-web-app-title", content: "Mail" },
    ],
    links: [
      { rel: "manifest", href: "/manifests/mail.webmanifest" },
      { rel: "apple-touch-icon", href: "/icons/mail-180.png" },
      { rel: "icon", type: "image/png", href: "/icons/mail-192.png" },
    ],
  }),
});

const MAILBOXES = ["Inbox", "Sent", "Drafts", "Spam", "Trash"] as const;
type Mailbox = (typeof MAILBOXES)[number];

// Additional IMAP folders surfaced under "More mailboxes". Stored as
// free-form strings on Mail.mailbox so any folder name works.
const MORE_MAILBOXES = [
  "Archive",
  "Notes",
  "Newsletters",
  "Receipts",
  "Travel",
  "[Gmail]/All Mail",
  "[Gmail]/Important",
];

// We adapt the existing Note shape to a mail message:
//   notebook → sender name (shown as the eyebrow label)
//   title    → subject
//   excerpt  → preview
//   body     → message paragraphs
//   tags     → labels (unused in sidebar; available on the message)
type Mail = Note & { from: string; email: string; mailbox: string; unread: boolean };

const INITIAL_MAIL: Mail[] = [
  {
    id: "m1",
    from: "Hana Ito",
    email: "hana@studio-meridian.jp",
    notebook: "Hana Ito",
    category: "Inbox",
    date: "10:42",
    title: "Revised proofs for the autumn issue",
    excerpt: "I've attached the second pass — the type sits better now, and we tightened the gutter…",
    body: [
      "I've attached the second pass — the type sits better now, and we tightened the gutter on the spreads you flagged.",
      "Let me know if the new heading weight reads warmer to you. I think it does, but I'd like a second pair of eyes before we send to print on Friday.",
      "Best,\nHana",
    ],
    tags: ["editorial"],
    wordCount: 92,
    mailbox: "Inbox",
    unread: true,
  },
  {
    id: "m2",
    from: "Marcus Whitfield",
    email: "marcus@quietmatter.co",
    notebook: "Marcus Whitfield",
    category: "Inbox",
    date: "Yesterday",
    title: "Re: dinner Thursday?",
    excerpt: "Eight works. There's a new place near the canal — I'll send the address tomorrow…",
    body: [
      "Eight works. There's a new place near the canal — I'll send the address tomorrow morning once I confirm with the others.",
      "Looking forward to it.",
    ],
    tags: ["personal"],
    wordCount: 28,
    mailbox: "Inbox",
    unread: true,
  },
  {
    id: "m3",
    from: "The Paper Quarterly",
    email: "newsletter@paperquarterly.com",
    notebook: "The Paper Quarterly",
    category: "Newsletter",
    date: "Mon",
    title: "Issue 47 — On the architecture of margins",
    excerpt: "This week, we visit a small bindery in Kyoto, examine a forgotten typeface, and ask whether…",
    body: [
      "This week, we visit a small bindery in Kyoto, examine a forgotten typeface, and ask whether the printed page still has a future in the age of the feed.",
      "Read the full issue on the web.",
    ],
    tags: ["reading"],
    wordCount: 41,
    mailbox: "Inbox",
    unread: false,
  },
  {
    id: "m4",
    from: "Ada Pereira",
    email: "ada@northlight.design",
    notebook: "Ada Pereira",
    category: "Inbox",
    date: "30 Sep",
    title: "Studio visit next month",
    excerpt: "We'll be in town the week of the 21st. Coffee at the new place, perhaps a short studio visit…",
    body: [
      "We'll be in town the week of the 21st. Coffee at the new place, perhaps a short studio visit if you can spare an hour.",
      "Let me know what works.",
    ],
    tags: [],
    wordCount: 33,
    mailbox: "Inbox",
    unread: false,
  },
  {
    id: "m5",
    from: "You",
    email: "elias@linden.studio",
    notebook: "You",
    category: "Sent",
    date: "08:12",
    title: "Re: Revised proofs for the autumn issue",
    excerpt: "Thanks Hana — taking a closer look this morning and will reply by lunch with notes…",
    body: ["Thanks Hana — taking a closer look this morning and will reply by lunch with notes."],
    tags: [],
    wordCount: 16,
    mailbox: "Sent",
    unread: false,
  },
  {
    id: "m6",
    from: "You",
    email: "elias@linden.studio",
    notebook: "You",
    category: "Draft",
    date: "Sat",
    title: "(no subject)",
    excerpt: "A few thoughts on the binding…",
    body: ["A few thoughts on the binding…"],
    tags: [],
    wordCount: 6,
    mailbox: "Drafts",
    unread: false,
  },
];

function MailApp() {
  const [mail, setMail] = useState<Mail[]>(INITIAL_MAIL);
  const [activeId, setActiveId] = useState<string>(INITIAL_MAIL[0].id);
  const [selectedIds, setSelectedIds] = useState<string[]>([INITIAL_MAIL[0].id]);
  const [lastClickedId, setLastClickedId] = useState<string>(INITIAL_MAIL[0].id);
  const [starred, setStarred] = useState<Record<string, boolean>>({});
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [detailOpenMobile, setDetailOpenMobile] = useState(false);
  const [selectionMode, setSelectionMode] = useState(false);
  const [dragging, setDragging] = useState<string[] | null>(null);
  const [dropTarget, setDropTarget] = useState<string | null>(null);
  // view: "all" | "unread" | "starred" | `mb:<Mailbox>`
  const [view, setView] = useState<string>("all");
  const [moveDialog, setMoveDialog] = useState<{ ids: string[] } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<null | { ids: string[]; mode: "selected" | "all" }>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  const isTouch = useIsTouch();

  const visibleMail = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return mail.filter((m) => {
      let inView = true;
      if (view === "all") inView = m.mailbox !== "Trash" && m.mailbox !== "Spam";
      else if (view === "unread") inView = m.unread && m.mailbox !== "Trash" && m.mailbox !== "Spam";
      else if (view === "starred") inView = !!starred[m.id] && m.mailbox !== "Trash";
      else if (view.startsWith("mb:")) inView = m.mailbox === (view.slice(3) as Mailbox);
      if (!inView) return false;
      if (!q) return true;
      const hay = `${m.from} ${m.title} ${m.excerpt} ${m.body.join(" ")}`.toLowerCase();
      return hay.includes(q);
    });
  }, [mail, view, starred, searchQuery]);

  const viewLabel = useMemo(() => {
    if (view === "all") return "All Mail";
    if (view === "unread") return "Unread";
    if (view === "starred") return "Starred";
    if (view.startsWith("mb:")) return view.slice(3);
    return "Mail";
  }, [view]);

  useEffect(() => {
    setSelectedIds([]);
    setSelectionMode(false);
  }, [view]);

  const active = mail.find((m) => m.id === activeId) ?? mail[0];
  const inTrash = view === "mb:Trash";

  const unreadCounts = useMemo(() => {
    const byMailbox: Record<string, number> = {};
    let all = 0;
    let unread = 0;
    for (const m of mail) {
      if (!m.unread) continue;
      byMailbox[m.mailbox] = (byMailbox[m.mailbox] ?? 0) + 1;
      if (m.mailbox !== "Trash" && m.mailbox !== "Spam") {
        all += 1;
        unread += 1;
      }
    }
    return { all, unread, byMailbox };
  }, [mail]);

  const starredCount = useMemo(
    () => mail.filter((m) => starred[m.id] && m.mailbox !== "Trash").length,
    [mail, starred],
  );

  // Mark active as read
  useEffect(() => {
    if (!active) return;
    if (active.unread) {
      setMail((prev) => prev.map((m) => (m.id === active.id ? { ...m, unread: false } : m)));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeId]);

  const handleSelect = (id: string, e: React.MouseEvent) => {
    if (selectionMode) {
      setSelectedIds((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
      setLastClickedId(id);
      return;
    }
    if (e.shiftKey) {
      const ids = visibleMail.map((m) => m.id);
      const a = ids.indexOf(lastClickedId);
      const b = ids.indexOf(id);
      if (a === -1 || b === -1) setSelectedIds([id]);
      else {
        const [s, eIdx] = a < b ? [a, b] : [b, a];
        setSelectedIds(ids.slice(s, eIdx + 1));
      }
    } else if (e.metaKey || e.ctrlKey) {
      setSelectedIds((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
      setLastClickedId(id);
    } else {
      setSelectedIds([id]);
      setLastClickedId(id);
      setActiveId(id);
      setDetailOpenMobile(true);
    }
  };

  const enterSelectionFor = (id: string) => {
    setSelectionMode(true);
    setSelectedIds((p) => (p.includes(id) ? p : [...p, id]));
  };
  const exitSelection = () => {
    setSelectionMode(false);
    setSelectedIds([activeId]);
  };

  const toggleStar = (id: string) => {
    setStarred((s) => {
      const next = !s[id];
      toast(next ? "Starred" : "Unstarred", {
        icon: next ? <Star className="size-4" fill="currentColor" /> : <StarOff className="size-4" />,
      });
      return { ...s, [id]: next };
    });
  };
  const moveOne = (id: string, mb: string) => {
    setMail((p) => p.map((m) => (m.id === id ? { ...m, mailbox: mb } : m)));
  };

  const markUnread = (ids: string[]) => {
    setMail((p) => p.map((m) => (ids.includes(m.id) ? { ...m, unread: true } : m)));
    toast(`Marked ${ids.length} as unread`, { icon: <MailIcon className="size-4" /> });
  };

  const batchStar = () => {
    setStarred((s) => {
      const allStarred = selectedIds.every((id) => s[id]);
      const next = { ...s };
      selectedIds.forEach((id) => (next[id] = !allStarred));
      toast(`${allStarred ? "Unstarred" : "Starred"} ${selectedIds.length}`, {
        icon: allStarred ? <StarOff className="size-4" /> : <Star className="size-4" fill="currentColor" />,
      });
      return next;
    });
  };
  const batchArchive = () => {
    setMail((p) => p.map((m) => (selectedIds.includes(m.id) ? { ...m, mailbox: "Trash" } : m)));
    toast(`Archived ${selectedIds.length} message${selectedIds.length === 1 ? "" : "s"}`, {
      icon: <Archive className="size-4" />,
    });
  };
  const moveToMailbox = (ids: string[], mb: string) => {
    setMail((p) => p.map((m) => (ids.includes(m.id) ? { ...m, mailbox: mb } : m)));
    toast(`Moved ${ids.length} to ${mb}`, { icon: <FolderInput className="size-4" /> });
  };

  const startDrag = (id: string) => {
    const ids = selectedIds.includes(id) && selectedIds.length > 1 ? selectedIds : [id];
    setDragging(ids);
  };
  const endDrag = () => {
    setDragging(null);
    setDropTarget(null);
  };
  const dropOnMailbox = (mb: string) => {
    if (!dragging) return;
    moveToMailbox(dragging, mb);
    endDrag();
  };

  const requestDeleteSelected = () => {
    if (selectedIds.length === 0) return;
    if (inTrash) {
      setConfirmDelete({ ids: selectedIds, mode: "selected" });
    } else {
      batchArchive();
    }
  };
  const reallyDelete = (ids: string[]) => {
    setMail((p) => p.filter((m) => !ids.includes(m.id)));
    setSelectedIds((p) => p.filter((id) => !ids.includes(id)));
    setSelectionMode(false);
    toast(`Deleted ${ids.length} message${ids.length === 1 ? "" : "s"}`, { icon: <Trash2 className="size-4" /> });
  };

  const compose = () => {
    const id = `m-${Date.now()}`;
    const draft: Mail = {
      id,
      from: "You",
      email: "elias@linden.studio",
      notebook: "You",
      category: "Draft",
      date: "Now",
      title: "",
      excerpt: "",
      body: [""],
      tags: [],
      wordCount: 0,
      mailbox: "Drafts",
      unread: false,
    };
    setMail((p) => [draft, ...p]);
    setActiveId(id);
    setSelectedIds([id]);
    setView("mb:Drafts");
    setDetailOpenMobile(true);
    toast("New message", { icon: <PenSquare className="size-4" /> });
  };

  const selectView = (v: string) => {
    setView(v);
    setDetailOpenMobile(false);
    if (typeof window !== "undefined" && window.matchMedia("(max-width: 767px)").matches) {
      setSidebarOpen(false);
    }
  };

  // Keyboard shortcuts: search focus, delete
  useEffect(() => {
    const isMac = typeof navigator !== "undefined" && /Mac|iPhone|iPad|iPod/.test(navigator.platform);
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const inField = !!target && (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName));
      if ((e.key === "k" && (e.metaKey || e.ctrlKey)) || (!inField && e.key === "/")) {
        e.preventDefault();
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
        return;
      }
      if (inField) return;
      const macDelete = isMac && (e.key === "Backspace" || (e.metaKey && e.key === "Backspace"));
      const winDelete = !isMac && e.key === "Delete";
      if ((macDelete || winDelete) && selectedIds.length > 0) {
        e.preventDefault();
        requestDeleteSelected();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [selectedIds, view]);

  const mailboxIcon: Record<Mailbox, React.ReactNode> = {
    Inbox: <InboxIcon className="size-3.5" />,
    Sent: <Send className="size-3.5" />,
    Drafts: <FileEdit className="size-3.5" />,
    Spam: <AlertOctagon className="size-3.5" />,
    Trash: <Trash className="size-3.5" />,
  };

  return (
    <TooltipProvider delayDuration={300}>
      <div
        className="flex h-dvh w-full overflow-hidden relative notes-root"
        style={{
          backgroundColor: "var(--color-cream, #f5f1e8)",
          fontFamily: "var(--font-sans)",
          ["--color-emerald" as string]: "oklch(0.858745 0.15558 94.085)",
          ["--mail-sidebar" as string]: "oklch(0.858745 0.15558 94.085)",
        }}
      >
        {/* Sidebar */}
        <aside
          data-open={sidebarOpen}
          className={`fixed md:static z-40 inset-y-0 left-0 shrink-0 flex flex-col border-r shadow-2xl md:shadow-none transition-[transform,margin,border-width] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] overflow-hidden will-change-transform ${
            sidebarOpen
              ? "translate-x-0 w-72 md:w-64"
              : "-translate-x-full w-72 md:w-64 md:-ml-64 md:border-r-0"
          }`}
          style={{
            backgroundColor: "var(--mail-sidebar)",
            borderColor: "color-mix(in oklab, var(--color-ink) 15%, transparent)",
          }}
        >
          <div className="p-6 md:p-8 flex items-center gap-3 justify-between">
            <div className="flex items-center gap-2 min-w-0">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 165 227" className="w-auto shrink-0" style={{ height: "54px", marginTop: "-5px" }} fill="none" aria-hidden="true">
                <path fill="var(--color-ink)" d="M72.476 3.94C80.143-2.42 92.81-.847 98.89 6.98c5.026 6.266 5.533 14.693 5.853 22.386.133 12.854-.88 25.667-1.32 38.507 5.693-14.027 9-29.387 18.16-41.72 5.987-8.32 19.013-10.213 26.787-3.347 6.826 6.16 6.92 16.414 5.013 24.747-5.373 21.387-12.547 42.267-19.827 63.067 8.04 6.706 13.44 16.24 15.174 26.56 3.2 19.52-.067 40.493-11.054 57.173-9.333 14.547-24.213 25.493-41.093 29.467-21.293 5.266-45.307 3.2-63.693-9.467C15.556 202.553 5.05 182.86.983 162.66c-1.48-7.8-1.813-16.587 2.8-23.454 3.467-5.813 9.8-8.866 15.88-11.2-1.027-3.68-2.093-7.64-.787-11.4 1.28-4.253 5.08-6.96 8.627-9.266-4.72-18.6-11.293-36.72-15.933-55.374-2.16-8.36-4.56-17.586-.894-25.906 3.507-8.6 14.24-13 22.867-9.734 6.133 2.147 10.44 7.534 13.547 13.014 6.56 12.093 10.013 25.506 14.013 38.573.653-14.707 1.307-29.413 2.64-44.08.747-7.253 2.907-15.04 8.733-19.893m8.84 9.893c-3.533 4.773-3.546 11.027-4.16 16.693-1.613 23.094-2.613 46.214-3.8 69.32 4.92.08 9.827.107 14.747.107.84-24.88 2.52-49.733 2.347-74.627-.187-4.08-.6-8.733-3.68-11.746-1.427-1.627-4.24-1.627-5.454.253M22.85 33.206c-.334 8.267 2.346 16.214 4.52 24.094 4.36 15.146 8.933 30.253 13.506 45.346 5.147-.72 10.294-1.466 15.414-2.36-5.347-17.64-10.36-35.373-16.107-52.893-2.667-6.693-5-14.24-10.8-18.92-3.147-2.36-6.587 1.6-6.533 4.733m110.626-.506c-5.293 6.973-7.773 15.493-10.96 23.533-5.546 14.96-11.466 29.773-16.906 44.773 5.306.667 10.506 1.96 15.72 3.08 6.48-19.693 13.96-39.12 18.48-59.4 1.106-4.586.986-9.466-1.307-13.68-1.72.267-3.987-.093-5.027 1.694M58.01 113.006c-8.974.814-18.32 2.04-26.094 6.92.414 6.587 7.08 9.414 12.6 10.84 14 3.534 28.467 1.174 42.64.254 4.52-.04 9.747-.787 13.52 2.306 3.107 2.56 2.88 7.854-.28 10.28-4.8 4.16-10.293 7.507-14.68 12.134-8.16 7.866-12.84 19.586-11.28 30.92.454 4.44 3.96 8.306 3.107 12.88-.587 2.96-4.427 3.546-6.72 2.2-6.133-2.734-9.32-9.254-10.68-15.507-10.48 4.533-22.48.213-30.147-7.56-4.56-4.667-9.546-10.293-9.253-17.24.133-3.36 4.027-7.013 7.293-4.76 5.454 4.293 8.507 10.96 14.12 15.133 3.147 2.467 7.534 5.014 11.547 3.054 2.56-2.107 1.56-5.934.693-8.654-4.12-10.56-12.293-19.28-21.973-25.026-7.587-4.067-18.747 1.626-18.467 10.666.174 13.24 5.254 26.08 12.254 37.147 8.133 12.867 22.013 21.627 36.986 23.96 16.254 2.52 34 .347 47.654-9.387 15.746-10.96 24.453-30.066 25-48.96.32-10.746-.76-22.613-8.014-31.133-6.813-7.64-17.546-9.387-27.226-10.2-14.174-.893-28.427-1.293-42.6-.267m-.387 32.36a79.6 79.6 0 0 1 8.68 13.48c3.28-5.253 7.24-10.026 11.653-14.373-6.76.6-13.546.867-20.333.893"/>
              </svg>
              <AppSwitcher />
            </div>
            <button
              aria-label="Close menu"
              onClick={() => setSidebarOpen(false)}
              className="size-8 rounded-full flex items-center justify-center transition-colors hover:bg-[color-mix(in_oklab,var(--color-ink)_8%,transparent)] md:hidden"
              style={{ color: "var(--color-ink)" }}
            >
              <X className="size-4" />
            </button>
          </div>

          <div className="px-4 mb-4">
            <button
              onClick={compose}
              className="w-full flex items-center justify-center gap-2 h-10 rounded-full text-sm font-medium transition-transform hover:-translate-y-0.5"
              style={{
                backgroundColor: "var(--color-ink)",
                color: "var(--color-emerald)",
                boxShadow:
                  "0 10px 24px -12px color-mix(in oklab, var(--color-ink) 60%, transparent)",
              }}
            >
              <PenSquare className="size-4" /> Compose
            </button>
          </div>

          <nav className="flex-1 px-4 space-y-7 overflow-y-auto">
            <ul className="space-y-1">
              <SidebarLink
                active={view === "all"}
                onClick={() => selectView("all")}
                icon={<InboxIcon className="size-3.5" />}
                badge={unreadCounts.all || undefined}
              >
                All Mail
              </SidebarLink>
              <SidebarLink
                active={view === "unread"}
                onClick={() => selectView("unread")}
                icon={<MailIcon className="size-3.5" />}
                badge={unreadCounts.unread || undefined}
              >
                Unread
              </SidebarLink>
              <SidebarLink
                active={view === "starred"}
                onClick={() => selectView("starred")}
                icon={<Star className="size-3.5" />}
                badge={starredCount || undefined}
              >
                Starred
              </SidebarLink>
            </ul>

            <SidebarGroup label="Mailboxes">
              {MAILBOXES.map((mb) => (
                <SidebarLink
                  key={mb}
                  active={view === `mb:${mb}`}
                  onClick={() => selectView(`mb:${mb}`)}
                  icon={mailboxIcon[mb]}
                  badge={unreadCounts.byMailbox[mb] || undefined}
                  isDropTarget={dropTarget === `mb:${mb}`}
                  onDragOver={(e) => {
                    if (dragging) {
                      e.preventDefault();
                      setDropTarget(`mb:${mb}`);
                    }
                  }}
                  onDragLeave={() => setDropTarget((t) => (t === `mb:${mb}` ? null : t))}
                  onDrop={(e) => {
                    e.preventDefault();
                    dropOnMailbox(mb);
                  }}
                >
                  {mb}
                </SidebarLink>
              ))}
            </SidebarGroup>

            <SidebarGroup label="More Mailboxes">
              {MORE_MAILBOXES.map((mb) => (
                <SidebarLink
                  key={mb}
                  active={view === `mb:${mb}`}
                  onClick={() => selectView(`mb:${mb}`)}
                  icon={<Folder className="size-3.5" />}
                  badge={unreadCounts.byMailbox[mb] || undefined}
                  isDropTarget={dropTarget === `mb:${mb}`}
                  onDragOver={(e) => {
                    if (dragging) {
                      e.preventDefault();
                      setDropTarget(`mb:${mb}`);
                    }
                  }}
                  onDragLeave={() => setDropTarget((t) => (t === `mb:${mb}` ? null : t))}
                  onDrop={(e) => {
                    e.preventDefault();
                    dropOnMailbox(mb);
                  }}
                >
                  {mb}
                </SidebarLink>
              ))}
            </SidebarGroup>
          </nav>

          <div
            className="p-4 md:p-6 flex items-center gap-2 shrink-0 border-t"
            style={{
              color: "color-mix(in oklab, var(--color-ink) 70%, transparent)",
              borderColor: "color-mix(in oklab, var(--color-ink) 10%, transparent)",
            }}
          >
            <div
              className="size-9 rounded-full flex items-center justify-center text-[11px] font-medium shrink-0"
              style={{
                backgroundColor: "color-mix(in oklab, var(--color-ink) 12%, transparent)",
                color: "var(--color-ink)",
              }}
            >
              EL
            </div>
            <div className="flex-1 min-w-0 text-sm truncate">Elias Linden</div>
            <Tooltip>
              <TooltipTrigger asChild>
                <Link
                  to="/"
                  aria-label="Log out"
                  className="size-9 rounded-full flex items-center justify-center transition-colors hover:bg-[color-mix(in_oklab,var(--color-ink)_18%,transparent)] hover:text-[var(--color-ink)]"
                  style={{
                    color: "color-mix(in oklab, var(--color-ink) 65%, transparent)",
                    backgroundColor: "color-mix(in oklab, var(--color-ink) 6%, transparent)",
                  }}
                >
                  <LogOut className="size-4" />
                </Link>
              </TooltipTrigger>
              <TooltipContent>Log out</TooltipContent>
            </Tooltip>
          </div>
        </aside>

        {sidebarOpen && (
          <div
            className="fixed inset-0 z-30 bg-black/30 md:hidden animate-in fade-in duration-300"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* List */}
        <section
          className={`flex-1 md:flex-none md:w-96 shrink-0 flex flex-col border-r min-w-0 relative transition-transform duration-300 ease-out md:transition-none ${
            detailOpenMobile ? "-translate-x-1/4 md:translate-x-0" : "translate-x-0"
          }`}
          style={{
            backgroundColor: "var(--color-cream, #f5f1e8)",
            borderColor: "color-mix(in oklab, var(--color-ink) 8%, transparent)",
          }}
        >
          <header
            className="p-4 md:p-6 border-b"
            style={{ borderColor: "color-mix(in oklab, var(--color-ink) 10%, transparent)" }}
          >
            <div className="flex items-center gap-3">
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    aria-label={sidebarOpen ? "Hide sidebar" : "Show sidebar"}
                    onClick={() => setSidebarOpen((v) => !v)}
                    className="size-9 rounded-full flex items-center justify-center shrink-0 transition-colors hover:bg-[color-mix(in_oklab,var(--color-ink)_12%,transparent)]"
                    style={{
                      color: "var(--color-ink)",
                      backgroundColor: "color-mix(in oklab, var(--color-ink) 6%, transparent)",
                    }}
                  >
                    <Menu className="size-4 md:hidden" />
                    {sidebarOpen ? (
                      <PanelLeftClose className="size-4 hidden md:block" />
                    ) : (
                      <PanelLeftOpen className="size-4 hidden md:block" />
                    )}
                  </button>
                </TooltipTrigger>
                <TooltipContent>{sidebarOpen ? "Hide sidebar" : "Show sidebar"}</TooltipContent>
              </Tooltip>
              <h2
                className="text-3xl leading-none flex-1 min-w-0 truncate"
                style={{ fontFamily: "var(--font-serif)", color: "var(--color-ink)" }}
              >
                {viewLabel}
              </h2>
              <div className="flex items-center gap-1.5 shrink-0">
                <ListAction label="Compose" onClick={compose}>
                  <PenSquare className="size-4" />
                </ListAction>
                {inTrash && visibleMail.length > 0 && (
                  <ListAction
                    label="Empty trash"
                    onClick={() =>
                      setConfirmDelete({ ids: visibleMail.map((m) => m.id), mode: "all" })
                    }
                  >
                    <Trash2 className="size-4" />
                  </ListAction>
                )}
              </div>
            </div>
            <p
              className="text-[10px] mt-2 uppercase tracking-[0.18em]"
              style={{ color: "color-mix(in oklab, var(--color-ink) 45%, transparent)" }}
            >
              {selectionMode || selectedIds.length > 1
                ? `${selectedIds.length} Selected`
                : `${visibleMail.length} Messages`}
            </p>
            <div
              className="mt-3 flex items-center gap-2 px-3 h-9 rounded-md"
              style={{
                backgroundColor: "color-mix(in oklab, var(--color-ink) 6%, transparent)",
                color: "var(--color-ink)",
              }}
            >
              <Search className="size-4 opacity-60 shrink-0" />
              <input
                ref={searchInputRef}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search mail…"
                className="flex-1 bg-transparent outline-none text-sm placeholder:opacity-50"
                onKeyDown={(e) => {
                  if (e.key === "Escape") {
                    e.preventDefault();
                    setSearchQuery("");
                    (e.target as HTMLInputElement).blur();
                  }
                }}
              />
              {searchQuery && (
                <button
                  aria-label="Clear search"
                  onClick={() => setSearchQuery("")}
                  className="size-6 rounded-full flex items-center justify-center hover:bg-[color-mix(in_oklab,var(--color-ink)_10%,transparent)]"
                >
                  <X className="size-3.5" />
                </button>
              )}
            </div>
          </header>

          <div className="flex-1 overflow-y-auto notes-swipe-list">
            {isTouch ? (
              <SwipeableList type={SwipeListType.IOS} fullSwipe={false}>
                {visibleMail.map((m) => (
                  <NoteListItem
                    key={m.id}
                    note={m}
                    isActive={m.id === activeId}
                    isSelected={selectedIds.includes(m.id)}
                    isStarred={!!starred[m.id]}
                    isArchived={m.mailbox === "Trash"}
                    unread={m.unread}
                    selectionMode={selectionMode}
                    isTouch
                    isDragging={dragging?.includes(m.id) ?? false}
                    onSelect={(e) => handleSelect(m.id, e)}
                    onStar={() => toggleStar(m.id)}
                    onArchive={() => moveOne(m.id, m.mailbox === "Trash" ? "Inbox" : "Trash")}
                    onLongPress={() => enterSelectionFor(m.id)}
                    onDragStart={() => startDrag(m.id)}
                    onDragEnd={endDrag}
                  />
                ))}
              </SwipeableList>
            ) : (
              visibleMail.map((m) => (
                <NoteListItem
                  key={m.id}
                  note={m}
                  isActive={m.id === activeId}
                  isSelected={selectedIds.includes(m.id)}
                  isStarred={!!starred[m.id]}
                  isArchived={m.mailbox === "Trash"}
                  unread={m.unread}
                  selectionMode={selectionMode}
                  isTouch={false}
                  isDragging={dragging?.includes(m.id) ?? false}
                  onSelect={(e) => handleSelect(m.id, e)}
                  onStar={() => toggleStar(m.id)}
                  onArchive={() => moveOne(m.id, m.mailbox === "Trash" ? "Inbox" : "Trash")}
                  onLongPress={() => enterSelectionFor(m.id)}
                  onDragStart={() => startDrag(m.id)}
                  onDragEnd={endDrag}
                />
              ))
            )}
            {visibleMail.length === 0 && (
              <div
                className="p-10 text-center text-sm"
                style={{ color: "color-mix(in oklab, var(--color-ink) 50%, transparent)" }}
              >
                No messages
              </div>
            )}
          </div>

          {(selectionMode || selectedIds.length > 1) && (
            <div
              className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30 flex items-center gap-1 px-2 py-2 rounded-full shadow-lg whitespace-nowrap"
              style={{ backgroundColor: "var(--color-ink)", color: "var(--color-cream, #f5f1e8)" }}
            >
              <span className="text-xs px-3 font-medium tabular-nums leading-9 inline-flex items-center">
                {selectedIds.length} items
              </span>
              <FabButton label="Star" onClick={batchStar}>
                <Star className="size-4" />
              </FabButton>
              <FabButton label="Mark as unread" onClick={() => markUnread(selectedIds)}>
                <MailIcon className="size-4" />
              </FabButton>
              {!inTrash && (
                <FabButton label="Archive" onClick={batchArchive}>
                  <Archive className="size-4" />
                </FabButton>
              )}
              <FabButton label="Move to mailbox" onClick={() => setMoveDialog({ ids: selectedIds })}>
                <FolderInput className="size-4" />
              </FabButton>
              {inTrash && (
                <FabButton label="Delete permanently" onClick={requestDeleteSelected}>
                  <Trash2 className="size-4" />
                </FabButton>
              )}
              <FabButton label="Done" onClick={exitSelection}>
                <X className="size-4" />
              </FabButton>
            </div>
          )}
        </section>

        {/* Detail */}
        <main
          className={`flex flex-col overflow-hidden absolute md:relative inset-0 md:inset-auto z-20 md:z-auto md:flex-1 transition-transform duration-300 ease-out md:transition-none ${
            detailOpenMobile ? "translate-x-0" : "translate-x-full md:translate-x-0"
          }`}
          style={{ backgroundColor: "var(--color-cream, #f5f1e8)" }}
        >
          <nav
            className="px-4 md:px-12 h-16 md:h-20 border-b flex items-center justify-between shrink-0 gap-3"
            style={{ borderColor: "color-mix(in oklab, var(--color-ink) 10%, transparent)" }}
          >
            <button
              aria-label="Back"
              onClick={() => setDetailOpenMobile(false)}
              className="md:hidden size-9 rounded-full flex items-center justify-center shrink-0"
              style={{
                color: "var(--color-ink)",
                backgroundColor: "color-mix(in oklab, var(--color-ink) 6%, transparent)",
              }}
            >
              <ArrowLeft className="size-4" />
            </button>
            <div className="flex items-center gap-2 shrink-0">
              <ToolbarButton label="Reply" onClick={() => toast("Reply", { icon: <Reply className="size-4" /> })}>
                <Reply className="size-4" />
              </ToolbarButton>
              <ToolbarButton
                label="Reply all"
                onClick={() => toast("Reply all", { icon: <ReplyAll className="size-4" /> })}
              >
                <ReplyAll className="size-4" />
              </ToolbarButton>
              <ToolbarButton
                label="Forward"
                onClick={() => toast("Forward", { icon: <Forward className="size-4" /> })}
              >
                <Forward className="size-4" />
              </ToolbarButton>
            </div>
            <div className="flex-1" />
            <div className="flex items-center gap-2 shrink-0">
              <ToolbarButton
                label="Move to mailbox"
                onClick={() => setMoveDialog({ ids: [active.id] })}
              >
                <FolderInput className="size-4" />
              </ToolbarButton>
              <ToolbarButton
                label="Mark as unread"
                onClick={() => markUnread([active.id])}
              >
                <MailIcon className="size-4" />
              </ToolbarButton>
              <ToolbarButton
                label="Star"
                onClick={() => toggleStar(active.id)}
                active={!!starred[active.id]}
              >
                <Star className="size-4" fill={starred[active.id] ? "currentColor" : "none"} />
              </ToolbarButton>
              <ToolbarButton
                label={active.mailbox === "Trash" ? "Restore" : "Archive"}
                onClick={() =>
                  moveOne(active.id, active.mailbox === "Trash" ? "Inbox" : "Trash")
                }
              >
                {active.mailbox === "Trash" ? (
                  <ArchiveRestore className="size-4" />
                ) : (
                  <Archive className="size-4" />
                )}
              </ToolbarButton>
            </div>
          </nav>

          <div className="flex-1 overflow-y-auto px-6 md:px-12 py-10 md:py-16">
            <article className="max-w-[680px] mx-auto">
              <div className="flex items-center gap-3 md:gap-6 text-[11px] uppercase tracking-[0.2em] mb-5">
                <span style={{ color: "var(--color-emerald)" }} className="font-medium truncate">
                  {active.mailbox}
                </span>
                <span
                  className="tabular-nums"
                  style={{ color: "color-mix(in oklab, var(--color-ink) 45%, transparent)" }}
                >
                  {active.date}
                </span>
              </div>

              <h1
                className="text-3xl md:text-4xl font-semibold leading-[1.1] tracking-tight mb-8"
                style={{ fontFamily: "var(--font-sans)", color: "var(--color-ink)" }}
              >
                {active.title || "(no subject)"}
              </h1>

              <div
                className="flex items-center gap-3 py-4 border-y mb-10"
                style={{ borderColor: "color-mix(in oklab, var(--color-ink) 10%, transparent)" }}
              >
                <div
                  className="size-10 rounded-full flex items-center justify-center text-xs font-semibold shrink-0"
                  style={{
                      backgroundColor: "var(--color-emerald)",
                    color: "var(--color-ink)",
                  }}
                >
                  {active.from
                    .split(" ")
                    .map((s) => s[0])
                    .slice(0, 2)
                    .join("")
                    .toUpperCase()}
                </div>
                <div className="min-w-0">
                  <div
                    className="text-sm font-semibold truncate"
                    style={{ color: "var(--color-ink)" }}
                  >
                    {active.from}
                  </div>
                  <div
                    className="text-xs truncate"
                    style={{ color: "color-mix(in oklab, var(--color-ink) 55%, transparent)" }}
                  >
                    {active.email} → me
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                {active.body.map((p, i) => (
                  <p
                    key={i}
                    className="text-base leading-relaxed whitespace-pre-wrap"
                    style={{ color: "color-mix(in oklab, var(--color-ink) 80%, transparent)" }}
                  >
                    {p}
                  </p>
                ))}
              </div>
            </article>
          </div>
        </main>

        {/* Move dialog — reuses MoveToDialog with mailboxes as the "notebook" list */}
        <MoveToDialog
          open={!!moveDialog}
          notebooks={[...MAILBOXES, ...MORE_MAILBOXES]}
          currentNotebook={
            moveDialog?.ids.length === 1
              ? mail.find((m) => m.id === moveDialog.ids[0])?.mailbox
              : undefined
          }
          onClose={() => setMoveDialog(null)}
          onConfirm={(mb) => {
            if (moveDialog) moveToMailbox(moveDialog.ids, mb);
            setMoveDialog(null);
          }}
        />

        <AlertDialog open={!!confirmDelete} onOpenChange={(o) => !o && setConfirmDelete(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                {confirmDelete?.mode === "all"
                  ? "Empty trash?"
                  : `Delete ${confirmDelete?.ids.length ?? 0} message${
                      confirmDelete?.ids.length === 1 ? `` : `s`
                    }?`}
              </AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete{" "}
                {confirmDelete?.mode === "all"
                  ? `all ${confirmDelete.ids.length} message${
                      confirmDelete.ids.length === 1 ? `` : `s`
                    } in trash`
                  : "the selected messages"}
                . This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onClick={() => {
                  if (confirmDelete) reallyDelete(confirmDelete.ids);
                  setConfirmDelete(null);
                }}
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </TooltipProvider>
  );
}
