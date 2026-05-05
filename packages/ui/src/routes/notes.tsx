import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Star, Archive, Plus, Pencil, Trash2, Menu, ArrowLeft, X, FolderInput, LogOut, Folder, Tag as TagIcon, ArchiveRestore, StarOff, PanelLeftClose, PanelLeftOpen, Search } from "lucide-react";
import { Link } from "@tanstack/react-router";
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
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  SwipeableList,
  Type as SwipeListType,
} from "react-swipeable-list";
import "react-swipeable-list/dist/styles.css";
import type { Note } from "@/types/note";
import { useIsTouch } from "@/hooks/use-is-touch";
import { NoteListItem } from "@/components/notes/note-list-item";
import { EditableText } from "@/components/notes/editable-text";
import {
  SidebarAddButton,
  SidebarGroup,
  SidebarLink,
} from "@/components/notes/sidebar";
import {
  ListAction,
  ToolbarButton,
  FabButton,
} from "@/components/notes/action-buttons";
import {
  MoveToDialog,
  AddDialog,
  EditDialog,
  DeleteDialog,
  TagPickerDialog,
} from "@/components/notes/dialogs";
import { AppSwitcher } from "@/components/app-switcher";

export const Route = createFileRoute("/notes")({
  component: NotesApp,
  head: () => ({
    meta: [
      { title: "Notes" },
      { name: "description", content: "A quiet, editorial workspace for your writing." },
      { name: "theme-color", content: "#23b572" },
      { name: "apple-mobile-web-app-title", content: "Notes" },
    ],
    links: [
      { rel: "manifest", href: "/manifests/notes.webmanifest" },
      { rel: "apple-touch-icon", href: "/icons/notes-180.png" },
      { rel: "icon", type: "image/png", href: "/icons/notes-192.png" },
    ],
  }),
});

const INITIAL_NOTEBOOKS = ["The Journal", "Field Observations", "Drafts", "Published"];
const INITIAL_TAGS = ["architecture", "nordic", "modernism", "essay", "travel", "criticism"];

const INITIAL_NOTES: Note[] = [
  {
    id: "1",
    category: "Essay",
    date: "12 Oct 2024",
    title: "The Architecture of Quiet",
    excerpt:
      "The silence of a library is not the absence of sound, but rather the presence of intense focus. We must consider...",
    pullQuote:
      "The silence of a library is not the absence of sound, but rather the presence of intense focus.",
    body: [
      "We must consider how space dictates thought. A high ceiling invites abstraction; a narrow corridor forces momentum. In designing digital workspaces, we have too often favored the momentum of the corridor — the endless scroll — over the contemplation of the high-ceilinged room.",
      "Consider the library at Oxford. The wood-paneled walls don't just insulate sound; they create an atmosphere of permanence. When you sit there, you are not merely a user of data, but a participant in a lineage of inquiry. Digital tools should strive for this same sense of gravitas.",
      "Every sentence we commit to paper — or to screen — should feel as though it is being carved into a physical medium. The ease with which we can delete digital text has led to a degradation of intent.",
    ],
    notebook: "The Journal",
    tags: ["architecture", "essay"],
    wordCount: 1248,
  },
  {
    id: "2",
    category: "Monograph",
    date: "08 Oct 2024",
    title: "Notes on the Nordic Coast",
    excerpt:
      "Sharp granite edges meet the Atlantic. The light here has a crystalline quality that refuses to be captured by...",
    body: [
      "Sharp granite edges meet the Atlantic. The light here has a crystalline quality that refuses to be captured by photography — it must be remembered, or written.",
      "The villages cling to the inlets as if the sea might decide, at any moment, to take them back. There is a humility in that arrangement that the inland cities have forgotten.",
    ],
    notebook: "Field Observations",
    tags: ["nordic", "travel"],
    wordCount: 842,
  },
  {
    id: "3",
    category: "Research",
    date: "29 Sep 2024",
    title: "A Revision of Modernity",
    excerpt:
      "When the Bauhaus movement first proposed its principles, the world was a different place. Today, we must ask...",
    body: [
      "When the Bauhaus movement first proposed its principles, the world was a different place. Today, we must ask whether the doctrine of pure function still serves us, or whether ornament — long exiled — has earned its return.",
      "The pendulum has swung. The minimalism of the last two decades was a reaction against excess. The next reaction is already underway.",
    ],
    notebook: "The Journal",
    tags: ["modernism", "criticism"],
    wordCount: 1567,
  },
  {
    id: "4",
    category: "Review",
    date: "24 Sep 2024",
    title: "The Printed Word in Digital Age",
    excerpt:
      "The tactile nature of paper is irreplaceable. The smell of ink, the grain of the page, the physical weight of...",
    body: [
      "The tactile nature of paper is irreplaceable. The smell of ink, the grain of the page, the physical weight of a bound volume — these are not nostalgic affectations. They are part of how meaning is transmitted.",
    ],
    notebook: "Drafts",
    tags: ["essay", "criticism"],
    wordCount: 612,
  },
];

function NotesApp() {
  const [notes, setNotes] = useState<Note[]>(INITIAL_NOTES);
  const [notebooks, setNotebooks] = useState<string[]>(INITIAL_NOTEBOOKS);
  const [tags, setTags] = useState<string[]>(INITIAL_TAGS);
  const [activeId, setActiveId] = useState<string>(INITIAL_NOTES[0].id);
  const [selectedIds, setSelectedIds] = useState<string[]>([INITIAL_NOTES[0].id]);
  const [lastClickedId, setLastClickedId] = useState<string>(INITIAL_NOTES[0].id);
  const [starred, setStarred] = useState<Record<string, boolean>>({});
  const [archived, setArchived] = useState<Record<string, boolean>>({});
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [detailOpenMobile, setDetailOpenMobile] = useState(false);
  const [selectionMode, setSelectionMode] = useState(false);
  const [dragging, setDragging] = useState<string[] | null>(null);
  const [dropTarget, setDropTarget] = useState<string | null>(null);
  const [view, setView] = useState<string>("all");

  const [moveDialog, setMoveDialog] = useState<{ ids: string[] } | null>(null);
  const [addDialog, setAddDialog] = useState<null | "notebook" | "tag">(null);
  const [editDialog, setEditDialog] = useState<null | { kind: "notebook" | "tag"; name: string }>(null);
  const [deleteDialog, setDeleteDialog] = useState<null | { kind: "notebook" | "tag"; name: string }>(null);
  const [tagDialog, setTagDialog] = useState<null | { noteId: string }>(null);
  const [confirmDelete, setConfirmDelete] = useState<null | { ids: string[]; mode: "selected" | "all" }>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  const isTouch = useIsTouch();

  const visibleNotes = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return notes.filter((n) => {
      let inView = true;
      if (view === "all") inView = !archived[n.id];
      else if (view === "starred") inView = !!starred[n.id] && !archived[n.id];
      else if (view === "archive") inView = !!archived[n.id];
      else if (view.startsWith("nb:")) inView = n.notebook === view.slice(3) && !archived[n.id];
      else if (view.startsWith("tag:")) inView = n.tags.includes(view.slice(4)) && !archived[n.id];
      if (!inView) return false;
      if (!q) return true;
      const hay = `${n.title} ${n.excerpt} ${n.body.join(" ")} ${n.notebook} ${n.tags.join(" ")}`.toLowerCase();
      return hay.includes(q);
    });
  }, [notes, view, starred, archived, searchQuery]);

  const viewLabel = useMemo(() => {
    if (view === "all") return "All Items";
    if (view === "starred") return "Starred";
    if (view === "archive") return "Archive";
    if (view.startsWith("nb:")) return view.slice(3);
    if (view.startsWith("tag:")) return `#${view.slice(4)}`;
    return "Writings";
  }, [view]);

  useEffect(() => {
    setSelectedIds([]);
    setSelectionMode(false);
  }, [view]);

  const active = notes.find((n) => n.id === activeId) ?? notes[0];

  const handleSelectNote = (id: string, e: React.MouseEvent) => {
    if (selectionMode) {
      setSelectedIds((prev) =>
        prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
      );
      setLastClickedId(id);
      return;
    }
    if (e.shiftKey) {
      const ids = visibleNotes.map((n) => n.id);
      const a = ids.indexOf(lastClickedId);
      const b = ids.indexOf(id);
      if (a === -1 || b === -1) {
        setSelectedIds([id]);
      } else {
        const [start, end] = a < b ? [a, b] : [b, a];
        setSelectedIds(ids.slice(start, end + 1));
      }
    } else if (e.metaKey || e.ctrlKey) {
      setSelectedIds((prev) =>
        prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
      );
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
    setSelectedIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
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
  const toggleArchive = (id: string) => {
    setArchived((s) => {
      const next = !s[id];
      toast(next ? "Archived" : "Unarchived", {
        icon: next ? <Archive className="size-4" /> : <ArchiveRestore className="size-4" />,
      });
      return { ...s, [id]: next };
    });
  };

  const batchStar = () => {
    setStarred((s) => {
      const allStarred = selectedIds.every((id) => s[id]);
      const next = { ...s };
      selectedIds.forEach((id) => (next[id] = !allStarred));
      toast(`${allStarred ? "Unstarred" : "Starred"} ${selectedIds.length} item${selectedIds.length === 1 ? "" : "s"}`, {
        icon: allStarred ? <StarOff className="size-4" /> : <Star className="size-4" fill="currentColor" />,
      });
      return next;
    });
  };
  const batchArchive = () => {
    setArchived((s) => {
      const allArch = selectedIds.every((id) => s[id]);
      const next = { ...s };
      selectedIds.forEach((id) => (next[id] = !allArch));
      toast(`${allArch ? "Unarchived" : "Archived"} ${selectedIds.length} item${selectedIds.length === 1 ? "" : "s"}`, {
        icon: allArch ? <ArchiveRestore className="size-4" /> : <Archive className="size-4" />,
      });
      return next;
    });
  };

  const moveToNotebook = (ids: string[], nb: string) => {
    setNotes((prev) => prev.map((n) => (ids.includes(n.id) ? { ...n, notebook: nb } : n)));
    toast(`Moved ${ids.length} item${ids.length === 1 ? "" : "s"} to “${nb}”`, {
      icon: <FolderInput className="size-4" />,
    });
  };

  const startDrag = (id: string) => {
    const ids = selectedIds.includes(id) && selectedIds.length > 1 ? selectedIds : [id];
    setDragging(ids);
  };
  const endDrag = () => {
    setDragging(null);
    setDropTarget(null);
  };
  const dropOnNotebook = (nb: string) => {
    if (!dragging) return;
    moveToNotebook(dragging, nb);
    endDrag();
  };
  const dropOnTag = (tag: string) => {
    if (!dragging) return;
    const ids = dragging;
    setNotes((prev) =>
      prev.map((n) =>
        ids.includes(n.id) && !n.tags.includes(tag) ? { ...n, tags: [...n.tags, tag] } : n,
      ),
    );
    toast(`Tagged ${ids.length} item${ids.length === 1 ? "" : "s"} with #${tag}`, { icon: <TagIcon className="size-4" /> });
    endDrag();
  };

  const addNotebook = (name: string) => {
    const v = name.trim();
    if (!v || notebooks.includes(v)) return;
    setNotebooks((p) => [...p, v]);
    toast(`Notebook “${v}” created`, { icon: <Folder className="size-4" /> });
  };
  const addTag = (name: string) => {
    const v = name.trim().replace(/^#/, "");
    if (!v || tags.includes(v)) return;
    setTags((p) => [...p, v]);
    toast(`Tag #${v} created`, { icon: <TagIcon className="size-4" /> });
  };
  const renameNotebook = (oldName: string, newName: string) => {
    const v = newName.trim();
    if (!v || (v !== oldName && notebooks.includes(v))) return;
    setNotebooks((p) => p.map((n) => (n === oldName ? v : n)));
    setNotes((p) => p.map((n) => (n.notebook === oldName ? { ...n, notebook: v } : n)));
    if (view === `nb:${oldName}`) setView(`nb:${v}`);
    toast(`Renamed to “${v}”`, { icon: <Pencil className="size-4" /> });
  };
  const renameTag = (oldName: string, newName: string) => {
    const v = newName.trim().replace(/^#/, "");
    if (!v || (v !== oldName && tags.includes(v))) return;
    setTags((p) => p.map((t) => (t === oldName ? v : t)));
    setNotes((p) =>
      p.map((n) => ({ ...n, tags: n.tags.map((t) => (t === oldName ? v : t)) })),
    );
    if (view === `tag:${oldName}`) setView(`tag:${v}`);
    toast(`Renamed to #${v}`, { icon: <Pencil className="size-4" /> });
  };
  const deleteNotebook = (name: string, opts: { transferTo?: string; archive?: boolean }) => {
    if (opts.transferTo) {
      const target = opts.transferTo;
      setNotes((p) => p.map((n) => (n.notebook === name ? { ...n, notebook: target } : n)));
    } else if (opts.archive) {
      setArchived((s) => {
        const next = { ...s };
        notes.forEach((n) => {
          if (n.notebook === name) next[n.id] = true;
        });
        return next;
      });
      const fallback = notebooks.find((nb) => nb !== name) ?? "";
      if (fallback) {
        setNotes((p) => p.map((n) => (n.notebook === name ? { ...n, notebook: fallback } : n)));
      }
    }
    setNotebooks((p) => p.filter((n) => n !== name));
    if (view === `nb:${name}`) setView("all");
    toast(`Notebook “${name}” deleted`, { icon: <Trash2 className="size-4" /> });
  };
  const deleteTag = (name: string) => {
    setTags((p) => p.filter((t) => t !== name));
    setNotes((p) => p.map((n) => ({ ...n, tags: n.tags.filter((t) => t !== name) })));
    if (view === `tag:${name}`) setView("all");
    toast(`Tag #${name} deleted`, { icon: <Trash2 className="size-4" /> });
  };

  const toggleNoteTag = (noteId: string, tag: string) => {
    let added = false;
    setNotes((prev) =>
      prev.map((n) => {
        if (n.id !== noteId) return n;
        const has = n.tags.includes(tag);
        added = !has;
        return { ...n, tags: has ? n.tags.filter((t) => t !== tag) : [...n.tags, tag] };
      }),
    );
    toast(added ? `Added #${tag}` : `Removed #${tag}`, { icon: <TagIcon className="size-4" /> });
  };

  const deleteSelectedNotes = (ids?: string[]) => {
    const target = ids ?? selectedIds;
    if (target.length === 0) return;
    const count = target.length;
    setNotes((p) => p.filter((n) => !target.includes(n.id)));
    setSelectedIds((prev) => prev.filter((id) => !target.includes(id)));
    if (target.length === selectedIds.length) setSelectionMode(false);
    toast(`Deleted ${count} item${count === 1 ? "" : "s"}`, {
      icon: <Trash2 className="size-4" />,
    });
  };

  const requestDeleteSelected = () => {
    if (selectedIds.length === 0) return;
    if (view === "archive") {
      setConfirmDelete({ ids: selectedIds, mode: "selected" });
    } else {
      setArchived((s) => {
        const next = { ...s };
        selectedIds.forEach((id) => (next[id] = true));
        return next;
      });
      toast(`Archived ${selectedIds.length} item${selectedIds.length === 1 ? "" : "s"}`, {
        icon: <Archive className="size-4" />,
      });
    }
  };

  const updateNote = (id: string, patch: Partial<Note>) => {
    setNotes((p) => p.map((n) => (n.id === id ? { ...n, ...patch } : n)));
  };

  const canCreateNote = !(view === "starred" || view === "archive");
  const createNote = () => {
    if (!canCreateNote) return;
    const targetNotebook = view.startsWith("nb:") ? view.slice(3) : (notebooks[0] ?? "Drafts");
    const targetTag = view.startsWith("tag:") ? view.slice(4) : null;
    const id = `n-${Date.now()}`;
    const now = new Date();
    const date = now.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
    const note: Note = {
      id,
      category: "Note",
      date,
      title: "",
      excerpt: "",
      body: [""],
      notebook: targetNotebook,
      tags: targetTag ? [targetTag] : [],
      wordCount: 0,
    };
    setNotes((p) => [note, ...p]);
    setActiveId(id);
    setSelectedIds([id]);
    setDetailOpenMobile(true);
    toast("New note", { icon: <Plus className="size-4" /> });
  };

  const selectedNotebook = view.startsWith("nb:") ? view.slice(3) : null;
  const selectedTag = view.startsWith("tag:") ? view.slice(4) : null;
  const canEditDelete = !!(selectedNotebook || selectedTag);

  const selectView = (v: string) => {
    setView(v);
    setDetailOpenMobile(false);
    if (typeof window !== "undefined" && window.matchMedia("(max-width: 767px)").matches) {
      setSidebarOpen(false);
    }
  };

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
      if (macDelete || winDelete) {
        if (selectedIds.length > 0) {
          e.preventDefault();
          requestDeleteSelected();
        }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [selectedIds, view]);

  return (
    <TooltipProvider delayDuration={300}>
      <div
        className="flex h-dvh w-full overflow-hidden relative notes-root"
        style={{ backgroundColor: "var(--color-paper)", fontFamily: "var(--font-sans)" }}
      >
        <aside
          data-open={sidebarOpen}
          className={`fixed md:static z-40 inset-y-0 left-0 shrink-0 flex flex-col border-r shadow-2xl md:shadow-none transition-[transform,margin,border-width] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] overflow-hidden will-change-transform ${
            sidebarOpen ? "translate-x-0 w-72 md:w-64" : "-translate-x-full w-72 md:w-64 md:-ml-64 md:border-r-0"
          }`}
          style={{
            backgroundColor: "var(--color-paper)",
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

          <nav className="flex-1 px-4 space-y-7 overflow-y-auto">
            <ul className="space-y-1">
              <SidebarLink active={view === "all"} onClick={() => selectView("all")}>All Items</SidebarLink>
              <SidebarLink active={view === "starred"} onClick={() => selectView("starred")}>Starred</SidebarLink>
              <SidebarLink active={view === "archive"} onClick={() => selectView("archive")}>Archive</SidebarLink>
            </ul>

            <SidebarGroup
              label="Notebooks"
              action={<SidebarAddButton label="New notebook" onClick={() => setAddDialog("notebook")} />}
            >
              {notebooks.map((nb) => (
                <SidebarLink
                  key={nb}
                  active={view === `nb:${nb}`}
                  onClick={() => selectView(`nb:${nb}`)}
                  isDropTarget={dropTarget === `nb:${nb}`}
                  onDragOver={(e) => {
                    if (dragging) {
                      e.preventDefault();
                      setDropTarget(`nb:${nb}`);
                    }
                  }}
                  onDragLeave={() => setDropTarget((t) => (t === `nb:${nb}` ? null : t))}
                  onDrop={(e) => {
                    e.preventDefault();
                    dropOnNotebook(nb);
                  }}
                >
                  {nb}
                </SidebarLink>
              ))}
            </SidebarGroup>

            <SidebarGroup
              label="Tags"
              action={<SidebarAddButton label="New tag" onClick={() => setAddDialog("tag")} />}
            >
              {tags.map((t) => (
                <SidebarLink
                  key={t}
                  active={view === `tag:${t}`}
                  onClick={() => selectView(`tag:${t}`)}
                  isDropTarget={dropTarget === `tag:${t}`}
                  onDragOver={(e) => {
                    if (dragging) {
                      e.preventDefault();
                      setDropTarget(`tag:${t}`);
                    }
                  }}
                  onDragLeave={() => setDropTarget((x) => (x === `tag:${t}` ? null : x))}
                  onDrop={(e) => {
                    e.preventDefault();
                    dropOnTag(t);
                  }}
                >
                  #{t}
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
                <ListAction
                  label="New note"
                  onClick={createNote}
                  disabled={!canCreateNote}
                >
                  <Plus className="size-4" />
                </ListAction>
                {canEditDelete && (
                  <>
                    <ListAction
                      label="Edit"
                      onClick={() =>
                        setEditDialog(
                          selectedNotebook
                            ? { kind: "notebook", name: selectedNotebook }
                            : { kind: "tag", name: selectedTag! },
                        )
                      }
                    >
                      <Pencil className="size-4" />
                    </ListAction>
                    <ListAction
                      label="Remove"
                      onClick={() =>
                        setDeleteDialog(
                          selectedNotebook
                            ? { kind: "notebook", name: selectedNotebook }
                            : { kind: "tag", name: selectedTag! },
                        )
                      }
                    >
                      <Trash2 className="size-4" />
                    </ListAction>
                  </>
                )}
                {view === "archive" && visibleNotes.length > 0 && (
                  <ListAction
                    label="Empty archive"
                    onClick={() =>
                      setConfirmDelete({ ids: visibleNotes.map((n) => n.id), mode: "all" })
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
                : `${visibleNotes.length} Files`}
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
                placeholder="Search notes…"
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
                {visibleNotes.map((note) => (
                  <NoteListItem
                    key={note.id}
                    note={note}
                    isActive={note.id === activeId}
                    isSelected={selectedIds.includes(note.id)}
                    isStarred={!!starred[note.id]}
                    isArchived={!!archived[note.id]}
                    selectionMode={selectionMode}
                    isTouch
                    isDragging={dragging?.includes(note.id) ?? false}
                    onSelect={(e) => handleSelectNote(note.id, e)}
                    onStar={() => toggleStar(note.id)}
                    onArchive={() => toggleArchive(note.id)}
                    onLongPress={() => enterSelectionFor(note.id)}
                    onDragStart={() => startDrag(note.id)}
                    onDragEnd={endDrag}
                  />
                ))}
              </SwipeableList>
            ) : (
              visibleNotes.map((note) => (
                <NoteListItem
                  key={note.id}
                  note={note}
                  isActive={note.id === activeId}
                  isSelected={selectedIds.includes(note.id)}
                  isStarred={!!starred[note.id]}
                  isArchived={!!archived[note.id]}
                  selectionMode={selectionMode}
                  isTouch={false}
                  isDragging={dragging?.includes(note.id) ?? false}
                  onSelect={(e) => handleSelectNote(note.id, e)}
                  onStar={() => toggleStar(note.id)}
                  onArchive={() => toggleArchive(note.id)}
                  onLongPress={() => enterSelectionFor(note.id)}
                  onDragStart={() => startDrag(note.id)}
                  onDragEnd={endDrag}
                />
              ))
            )}
            {visibleNotes.length === 0 && (
              <div
                className="p-10 text-center text-sm"
                style={{ color: "color-mix(in oklab, var(--color-ink) 50%, transparent)" }}
              >
                No items
              </div>
            )}
          </div>

          {(selectionMode || selectedIds.length > 1) && (
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30 flex items-center gap-1 px-2 py-2 rounded-full shadow-lg whitespace-nowrap"
              style={{
                backgroundColor: "var(--color-ink)",
                color: "var(--color-cream, #f5f1e8)",
              }}
            >
              <span className="text-xs px-3 font-medium tabular-nums leading-9 inline-flex items-center">
                {selectedIds.length} items
              </span>
              <FabButton label="Star" onClick={batchStar}>
                <Star className="size-4" />
              </FabButton>
              {view !== "archive" && (
                <FabButton label="Archive" onClick={batchArchive}>
                  <Archive className="size-4" />
                </FabButton>
              )}
              <FabButton label="Move to notebook" onClick={() => setMoveDialog({ ids: selectedIds })}>
                <FolderInput className="size-4" />
              </FabButton>
              {view === "archive" && (
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
            <div className="flex-1" />
            <div className="flex items-center gap-2 shrink-0">
              <ToolbarButton label="Move to notebook" onClick={() => setMoveDialog({ ids: [active.id] })}>
                <FolderInput className="size-4" />
              </ToolbarButton>
              <ToolbarButton label="Star" onClick={() => toggleStar(active.id)} active={!!starred[active.id]}>
                <Star className="size-4" fill={starred[active.id] ? "currentColor" : "none"} />
              </ToolbarButton>
              <ToolbarButton
                label={archived[active.id] ? "Unarchive" : "Archive"}
                onClick={() => toggleArchive(active.id)}
                active={!!archived[active.id]}
              >
                {archived[active.id] ? <ArchiveRestore className="size-4" /> : <Archive className="size-4" />}
              </ToolbarButton>
            </div>
          </nav>

          <div className="flex-1 overflow-y-auto px-6 md:px-12 py-10 md:py-16">
            <article className="max-w-[680px] mx-auto">
              <div className="flex items-center gap-3 md:gap-6 text-[11px] uppercase tracking-[0.2em] mb-5">
                <span style={{ color: "var(--color-emerald)" }} className="font-medium truncate">
                  {active.notebook}
                </span>
                <span
                  className="tabular-nums"
                  style={{ color: "color-mix(in oklab, var(--color-ink) 45%, transparent)" }}
                >
                  Edited {active.date}
                </span>
              </div>

              <EditableText
                key={`title-${active.id}`}
                value={active.title}
                onChange={(v) => updateNote(active.id, { title: v })}
                as="h1"
                className="text-3xl md:text-4xl font-semibold leading-[1.1] tracking-tight mb-8 md:mb-10 outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 rounded-sm"
                style={{ fontFamily: "var(--font-sans)", color: "var(--color-ink)" }}
                singleLine
                placeholder="Untitled"
              />

              <div
                className="flex flex-wrap items-center gap-2 py-6 border-y mb-12"
                style={{ borderColor: "color-mix(in oklab, var(--color-ink) 10%, transparent)" }}
              >
                {active.tags.map((t) => (
                  <span
                    key={t}
                    className="text-[13px] px-3 py-1.5 rounded-full font-medium inline-flex items-center gap-1 group"
                    style={{
                      backgroundColor: "color-mix(in oklab, var(--color-ink) 8%, transparent)",
                      color: "var(--color-ink)",
                    }}
                  >
                    #{t}
                    <button
                      onClick={() => toggleNoteTag(active.id, t)}
                      aria-label={`Remove tag ${t}`}
                      className="opacity-50 hover:opacity-100 transition-opacity"
                    >
                      <X className="size-3" />
                    </button>
                  </span>
                ))}
                <button
                  onClick={() => setTagDialog({ noteId: active.id })}
                  className="text-[13px] px-3 py-1.5 rounded-full font-medium inline-flex items-center gap-1 border border-dashed transition-colors hover:opacity-80"
                  style={{
                    borderColor: "color-mix(in oklab, var(--color-ink) 25%, transparent)",
                    color: "color-mix(in oklab, var(--color-ink) 65%, transparent)",
                  }}
                >
                  <Plus className="size-3" /> Tag
                </button>
              </div>

              {active.pullQuote && (
                <p
                  className="text-xl leading-snug mb-8 font-medium"
                  style={{
                    fontFamily: "var(--font-sans)",
                    color: "color-mix(in oklab, var(--color-ink) 85%, transparent)",
                  }}
                >
                  “{active.pullQuote}”
                </p>
              )}

              <div className="space-y-6">
                {active.body.map((p, i) => (
                  <EditableText
                    key={`${active.id}-p-${i}`}
                    value={p}
                    onChange={(v) => {
                      const next = [...active.body];
                      next[i] = v;
                      updateNote(active.id, { body: next });
                    }}
                    as="p"
                    className="text-base leading-relaxed outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 rounded-sm whitespace-pre-wrap"
                    style={{ color: "color-mix(in oklab, var(--color-ink) 80%, transparent)" }}
                    placeholder="Write…"
                  />
                ))}
              </div>
            </article>
          </div>
        </main>

        <MoveToDialog
          open={!!moveDialog}
          notebooks={notebooks}
          currentNotebook={moveDialog?.ids.length === 1 ? notes.find((n) => n.id === moveDialog.ids[0])?.notebook : undefined}
          onClose={() => setMoveDialog(null)}
          onConfirm={(nb) => {
            if (moveDialog) moveToNotebook(moveDialog.ids, nb);
            setMoveDialog(null);
          }}
        />

        <AddDialog
          kind={addDialog}
          existing={addDialog === "notebook" ? notebooks : tags}
          onClose={() => setAddDialog(null)}
          onConfirm={(name) => {
            if (addDialog === "notebook") addNotebook(name);
            else if (addDialog === "tag") addTag(name);
            setAddDialog(null);
          }}
        />

        <EditDialog
          item={editDialog}
          onClose={() => setEditDialog(null)}
          onConfirm={(newName) => {
            if (!editDialog) return;
            if (editDialog.kind === "notebook") renameNotebook(editDialog.name, newName);
            else renameTag(editDialog.name, newName);
            setEditDialog(null);
          }}
        />

        <DeleteDialog
          item={deleteDialog}
          notebooks={notebooks}
          affectedCount={
            deleteDialog
              ? deleteDialog.kind === "notebook"
                ? notes.filter((n) => n.notebook === deleteDialog.name).length
                : notes.filter((n) => n.tags.includes(deleteDialog.name)).length
              : 0
          }
          onClose={() => setDeleteDialog(null)}
          onConfirm={(opts) => {
            if (!deleteDialog) return;
            if (deleteDialog.kind === "notebook") {
              deleteNotebook(deleteDialog.name, opts);
            } else {
              deleteTag(deleteDialog.name);
            }
            setDeleteDialog(null);
          }}
        />

        <TagPickerDialog
          open={!!tagDialog}
          allTags={tags}
          selected={tagDialog ? notes.find((n) => n.id === tagDialog.noteId)?.tags ?? [] : []}
          onClose={() => setTagDialog(null)}
          onToggle={(t) => {
            if (tagDialog) toggleNoteTag(tagDialog.noteId, t);
          }}
          onCreate={(t) => {
            addTag(t);
            if (tagDialog) toggleNoteTag(tagDialog.noteId, t.trim().replace(/^#/, ""));
          }}
        />

        <AlertDialog open={!!confirmDelete} onOpenChange={(o) => !o && setConfirmDelete(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                {confirmDelete?.mode === "all"
                  ? "Empty archive?"
                  : `Delete ${confirmDelete?.ids.length ?? 0} item${confirmDelete?.ids.length === 1 ? `` : `s`}?`}
              </AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete{" "}
                {confirmDelete?.mode === "all"
                  ? `all ${confirmDelete.ids.length} archived item${confirmDelete.ids.length === 1 ? `` : `s`}`
                  : "the selected items"}
                . This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onClick={() => {
                  if (confirmDelete) deleteSelectedNotes(confirmDelete.ids);
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
