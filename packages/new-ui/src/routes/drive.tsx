import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  Star,
  Trash2,
  Menu,
  X,
  LogOut,
  Search,
  PanelLeftClose,
  PanelLeftOpen,
  Upload,
  FolderInput,
  StarOff,
  HardDrive,
  Folder,
  Clock,
  Users,
  Cloud,
  Download,
  Share2,
  FileText,
  FileImage,
  FileVideo,
  FileAudio,
  FileArchive,
  File as FileIcon,
  ArrowLeft,
  LayoutGrid,
  List as ListIcon,
  Info,
  ChevronRight,
  FolderPlus,
  Plus,
  FileSpreadsheet,
  Presentation,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/ui/tooltip";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/ui/alert-dialog";
import type { Note } from "@/lib/models/note";
import { useIsTouch } from "@/hooks/use-is-touch";
import { SidebarGroup, SidebarLink } from "@/settings-sidebar/src/settings-sidebar";
import { ListAction, FabButton } from "@/action-buttons/src/action-buttons";
import { MoveToDialog } from "@/dialogs/src/dialogs";
import { WorkspaceAppSwitcher } from "@/workspace-app-switcher/src/workspace-app-switcher";

export const Route = createFileRoute("/drive")({
  component: DriveApp,
  head: () => ({
    meta: [
      { title: "Drive" },
      { name: "description", content: "Files and folders, organized." },
      { name: "theme-color", content: "#0c8397" },
      { name: "apple-mobile-web-app-title", content: "Drive" },
    ],
    links: [
      { rel: "manifest", href: "/manifests/drive.webmanifest" },
      { rel: "apple-touch-icon", href: "/icons/drive-180.png" },
      { rel: "icon", type: "image/png", href: "/icons/drive-192.png" },
    ],
  }),
});

const TOP_FOLDERS = ["My Drive", "Shared with me", "Trash"] as const;
type TopFolder = (typeof TOP_FOLDERS)[number];

type FileKind = "folder" | "doc" | "image" | "video" | "audio" | "archive" | "file";
type DriveFile = Note & {
  parent: string; // path like "My Drive" or "My Drive/Studio Assets"
  kind: FileKind;
  size: string;
  owner: string;
};

const kindIcon: Record<FileKind, React.ReactNode> = {
  folder: <Folder className="size-3" />,
  doc: <FileText className="size-3" />,
  image: <FileImage className="size-3" />,
  video: <FileVideo className="size-3" />,
  audio: <FileAudio className="size-3" />,
  archive: <FileArchive className="size-3" />,
  file: <FileIcon className="size-3" />,
};

const kindIconLg: Record<FileKind, React.ReactNode> = {
  folder: <Folder className="size-10" />,
  doc: <FileText className="size-10" />,
  image: <FileImage className="size-10" />,
  video: <FileVideo className="size-10" />,
  audio: <FileAudio className="size-10" />,
  archive: <FileArchive className="size-10" />,
  file: <FileIcon className="size-10" />,
};

const INITIAL_FILES: DriveFile[] = [
  {
    id: "f-studio",
    notebook: "Folder",
    category: "Folder",
    date: "Mon",
    title: "Studio Assets",
    excerpt: "12 items · 84 MB",
    body: ["Brand guidelines, logos and templates."],
    tags: [],
    wordCount: 0,
    parent: "My Drive",
    kind: "folder",
    size: "84 MB",
    owner: "You",
  },
  {
    id: "f-archives",
    notebook: "Folder",
    category: "Folder",
    date: "12 Sep",
    title: "Archives",
    excerpt: "8 items · 22 MB",
    body: ["Older work, kept for reference."],
    tags: [],
    wordCount: 0,
    parent: "My Drive",
    kind: "folder",
    size: "22 MB",
    owner: "You",
  },
  {
    id: "f1",
    notebook: "Doc · 240 KB",
    category: "Document",
    date: "10:42",
    title: "Autumn Issue — Final Proofs.pdf",
    excerpt: "Last edited by Hana Ito · shared with 3 people",
    body: ["A bound PDF of the autumn issue, ready for sign-off."],
    tags: ["editorial"],
    wordCount: 0,
    parent: "My Drive",
    kind: "doc",
    size: "240 KB",
    owner: "Hana Ito",
  },
  {
    id: "f2",
    notebook: "Image · 4.2 MB",
    category: "Image",
    date: "Yesterday",
    title: "Cover-Photo-Granite.jpg",
    excerpt: "Hero image for the Nordic Coast feature",
    body: ["Shot on a Mamiya 7, scanned at 4000 dpi."],
    tags: ["photo"],
    wordCount: 0,
    parent: "My Drive",
    kind: "image",
    size: "4.2 MB",
    owner: "You",
  },
  {
    id: "f6",
    notebook: "Audio · 8 MB",
    category: "Audio",
    date: "Sat",
    title: "interview-ada-pereira.m4a",
    excerpt: "Recorded for the Northlight feature",
    body: [],
    tags: [],
    wordCount: 0,
    parent: "My Drive",
    kind: "audio",
    size: "8 MB",
    owner: "You",
  },
  {
    id: "f-logo",
    notebook: "Image · 1.1 MB",
    category: "Image",
    date: "Mon",
    title: "studio-mark-final.svg",
    excerpt: "Vector mark, final lockup",
    body: [],
    tags: [],
    wordCount: 0,
    parent: "My Drive/Studio Assets",
    kind: "image",
    size: "1.1 MB",
    owner: "You",
  },
  {
    id: "f-guide",
    notebook: "Doc · 3.4 MB",
    category: "Document",
    date: "Mon",
    title: "Brand-Guidelines.pdf",
    excerpt: "Typography, color, voice",
    body: [],
    tags: [],
    wordCount: 0,
    parent: "My Drive/Studio Assets",
    kind: "doc",
    size: "3.4 MB",
    owner: "You",
  },
  {
    id: "f4",
    notebook: "Video · 128 MB",
    category: "Video",
    date: "30 Sep",
    title: "Bindery-Walkthrough.mov",
    excerpt: "Short film from the Kyoto bindery visit",
    body: ["A 3-minute clip walking through the bindery floor."],
    tags: ["travel"],
    wordCount: 0,
    parent: "Shared with me",
    kind: "video",
    size: "128 MB",
    owner: "Marcus Whitfield",
  },
  {
    id: "f5",
    notebook: "Archive · 12 MB",
    category: "Archive",
    date: "24 Sep",
    title: "old-website-export.zip",
    excerpt: "Archive of the previous studio site",
    body: [],
    tags: [],
    wordCount: 0,
    parent: "My Drive/Archives",
    kind: "archive",
    size: "12 MB",
    owner: "You",
  },
];

type ViewKey =
  | { type: "folder"; path: string }
  | { type: "recent" }
  | { type: "starred" }
  | { type: "shared" };

function DriveApp() {
  const [files, setFiles] = useState<DriveFile[]>(INITIAL_FILES);
  const [view, setView] = useState<ViewKey>({ type: "folder", path: "My Drive" });
  const [activeId, setActiveId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [lastClickedId, setLastClickedId] = useState<string | null>(null);
  const [starred, setStarred] = useState<Record<string, boolean>>({});
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectionMode, setSelectionMode] = useState(false);
  const [dragging, setDragging] = useState<string[] | null>(null);
  const [dropTarget, setDropTarget] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [moveDialog, setMoveDialog] = useState<{ ids: string[] } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<null | { ids: string[] }>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const isTouch = useIsTouch();

  const inTrashView = view.type === "folder" && view.path === "Trash";

  const isUnderTrash = (parent: string) => parent === "Trash" || parent.startsWith("Trash/");

  const visibleItems = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const filtered = files.filter((f) => {
      let inView = false;
      if (view.type === "folder") inView = f.parent === view.path;
      else if (view.type === "recent") inView = !isUnderTrash(f.parent) && f.kind !== "folder";
      else if (view.type === "starred") inView = !!starred[f.id] && !isUnderTrash(f.parent);
      else if (view.type === "shared")
        inView = f.parent === "Shared with me" || f.parent.startsWith("Shared with me/");
      if (!inView) return false;
      if (!q) return true;
      const hay = `${f.title} ${f.excerpt} ${f.owner}`.toLowerCase();
      return hay.includes(q);
    });
    // folders first
    return filtered.sort((a, b) => {
      if (a.kind === "folder" && b.kind !== "folder") return -1;
      if (b.kind === "folder" && a.kind !== "folder") return 1;
      return 0;
    });
  }, [files, view, starred, searchQuery]);

  const breadcrumbs = useMemo(() => {
    if (view.type !== "folder") {
      return [
        {
          label:
            view.type === "recent" ? "Recent" : view.type === "starred" ? "Starred" : "Shared with me",
          path: null as string | null,
        },
      ];
    }
    const parts = view.path.split("/");
    return parts.map((p, i) => ({ label: p, path: parts.slice(0, i + 1).join("/") }));
  }, [view]);

  const viewLabel = breadcrumbs[breadcrumbs.length - 1].label;

  useEffect(() => {
    setSelectedIds([]);
    setActiveId(null);
    setSelectionMode(false);
    setDetailOpen(false);
  }, [view.type, view.type === "folder" ? view.path : ""]);

  const counts = useMemo(() => {
    const byPath: Record<string, number> = {};
    for (const f of files) byPath[f.parent] = (byPath[f.parent] ?? 0) + 1;
    const topCount = (top: string) =>
      files.filter((f) => f.parent === top || f.parent.startsWith(top + "/")).length;
    return {
      byPath,
      myDrive: topCount("My Drive"),
      trash: topCount("Trash"),
      starred: files.filter((f) => starred[f.id] && !isUnderTrash(f.parent)).length,
      shared: topCount("Shared with me"),
    };
  }, [files, starred]);

  const active = activeId ? files.find((f) => f.id === activeId) ?? null : null;

  const openFile = (f: DriveFile) => {
    if (f.kind === "folder") {
      const next = f.parent === "" ? f.title : `${f.parent}/${f.title}`;
      setView({ type: "folder", path: next });
    } else {
      setActiveId(f.id);
      setSelectedIds([f.id]);
      setDetailOpen(true);
    }
  };

  const handleSelect = (id: string, e: React.MouseEvent) => {
    if (selectionMode) {
      setSelectedIds((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
      setLastClickedId(id);
      return;
    }
    if (e.shiftKey && lastClickedId) {
      const ids = visibleItems.map((f) => f.id);
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
    }
  };

  const enterSelectionFor = (id: string) => {
    setSelectionMode(true);
    setSelectedIds((p) => (p.includes(id) ? p : [...p, id]));
  };
  const exitSelection = () => {
    setSelectionMode(false);
    setSelectedIds(activeId ? [activeId] : []);
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
  const moveOne = (id: string, parent: string) => {
    setFiles((p) => p.map((f) => (f.id === id ? { ...f, parent } : f)));
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
  const batchTrash = () => {
    setFiles((p) => p.map((f) => (selectedIds.includes(f.id) ? { ...f, parent: "Trash" } : f)));
    toast(`Moved ${selectedIds.length} to Trash`, { icon: <Trash2 className="size-4" /> });
  };
  const moveToFolder = (ids: string[], parent: string) => {
    setFiles((p) => p.map((f) => (ids.includes(f.id) ? { ...f, parent } : f)));
    toast(`Moved ${ids.length} to ${parent.split("/").pop()}`, { icon: <FolderInput className="size-4" /> });
  };

  const startDrag = (id: string) => {
    const ids = selectedIds.includes(id) && selectedIds.length > 1 ? selectedIds : [id];
    setDragging(ids);
  };
  const endDrag = () => {
    setDragging(null);
    setDropTarget(null);
  };
  const dropOnFolder = (parent: string) => {
    if (!dragging) return;
    moveToFolder(dragging.filter((id) => !parent.startsWith(id)), parent);
    endDrag();
  };

  const requestDeleteSelected = () => {
    if (selectedIds.length === 0) return;
    if (inTrashView) setConfirmDelete({ ids: selectedIds });
    else batchTrash();
  };
  const reallyDelete = (ids: string[]) => {
    setFiles((p) => p.filter((f) => !ids.includes(f.id)));
    setSelectedIds((p) => p.filter((id) => !ids.includes(id)));
    setSelectionMode(false);
    if (activeId && ids.includes(activeId)) {
      setActiveId(null);
      setDetailOpen(false);
    }
    toast(`Deleted ${ids.length} file${ids.length === 1 ? "" : "s"}`, { icon: <Trash2 className="size-4" /> });
  };

  const handleUpload = (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    const targetParent = view.type === "folder" ? view.path : "My Drive";
    const created: DriveFile[] = Array.from(fileList).map((file, i) => {
      const kind: FileKind = file.type.startsWith("image/")
        ? "image"
        : file.type.startsWith("video/")
          ? "video"
          : file.type.startsWith("audio/")
            ? "audio"
            : /zip|tar|gzip/.test(file.type)
              ? "archive"
              : /pdf|text|document/.test(file.type)
                ? "doc"
                : "file";
      const sizeKb = file.size / 1024;
      const size = sizeKb > 1024 ? `${(sizeKb / 1024).toFixed(1)} MB` : `${Math.round(sizeKb)} KB`;
      return {
        id: `f-${Date.now()}-${i}`,
        notebook: `${kind[0].toUpperCase()}${kind.slice(1)} · ${size}`,
        category: kind,
        date: "Now",
        title: file.name,
        excerpt: `Uploaded just now · ${size}`,
        body: [],
        tags: [],
        wordCount: 0,
        parent: targetParent,
        kind,
        size,
        owner: "You",
      };
    });
    setFiles((p) => [...created, ...p]);
    toast(`Uploaded ${created.length} file${created.length === 1 ? "" : "s"}`, {
      icon: <Upload className="size-4" />,
    });
  };

  const createFolder = () => {
    const name = window.prompt("New folder name");
    const v = name?.trim();
    if (!v) return;
    const targetParent = view.type === "folder" ? view.path : "My Drive";
    const id = `f-${Date.now()}`;
    setFiles((p) => [
      {
        id,
        notebook: "Folder",
        category: "Folder",
        date: "Now",
        title: v,
        excerpt: "0 items",
        body: [],
        tags: [],
        wordCount: 0,
        parent: targetParent,
        kind: "folder",
        size: "—",
        owner: "You",
      },
      ...p,
    ]);
    toast(`Folder “${v}” created`, { icon: <FolderPlus className="size-4" /> });
  };

  const createBlank = (kind: "doc" | "sheet" | "slides") => {
    const meta =
      kind === "doc"
        ? { title: "Untitled document.docx", category: "Document", note: "Doc · 0 KB", k: "doc" as FileKind }
        : kind === "sheet"
          ? { title: "Untitled spreadsheet.xlsx", category: "Spreadsheet", note: "Sheet · 0 KB", k: "doc" as FileKind }
          : { title: "Untitled presentation.pptx", category: "Presentation", note: "Slides · 0 KB", k: "doc" as FileKind };
    const targetParent = view.type === "folder" ? view.path : "My Drive";
    const id = `f-${Date.now()}`;
    setFiles((p) => [
      {
        id,
        notebook: meta.note,
        category: meta.category,
        date: "Now",
        title: meta.title,
        excerpt: "Created just now",
        body: [],
        tags: [],
        wordCount: 0,
        parent: targetParent,
        kind: meta.k,
        size: "0 KB",
        owner: "You",
      },
      ...p,
    ]);
    toast(`${meta.category} created`, { icon: <Plus className="size-4" /> });
  };

  const selectView = (v: ViewKey) => {
    setView(v);
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
      if (e.key === "Escape" && detailOpen) {
        setDetailOpen(false);
        return;
      }
      const macDelete = isMac && (e.key === "Backspace" || (e.metaKey && e.key === "Backspace"));
      const winDelete = !isMac && e.key === "Delete";
      if ((macDelete || winDelete) && selectedIds.length > 0) {
        e.preventDefault();
        requestDeleteSelected();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [selectedIds, view, detailOpen]);

  // All folder paths for drop targets and Move dialog
  const allFolderPaths = useMemo(() => {
    const set = new Set<string>(["My Drive", "Shared with me", "Trash"]);
    for (const f of files) {
      if (f.kind === "folder") {
        const path = f.parent === "" ? f.title : `${f.parent}/${f.title}`;
        set.add(path);
      }
    }
    return Array.from(set);
  }, [files]);

  const topFolderIcon: Record<TopFolder, React.ReactNode> = {
    "My Drive": <HardDrive className="size-3.5" />,
    "Shared with me": <Users className="size-3.5" />,
    Trash: <Trash2 className="size-3.5" />,
  };

  return (
    <TooltipProvider delayDuration={300}>
      <div
        className="flex h-dvh w-full overflow-hidden relative notes-root"
        style={{
          backgroundColor: "var(--color-cream, #f5f1e8)",
          fontFamily: "var(--font-sans)",
          ["--color-emerald" as string]: "#0c8397",
          ["--drive-sidebar" as string]: "#0c8397",
        }}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={(e) => {
            handleUpload(e.target.files);
            e.target.value = "";
          }}
        />

        {/* Sidebar */}
        <aside
          data-open={sidebarOpen}
          className={`fixed md:static z-40 inset-y-0 left-0 shrink-0 flex flex-col border-r shadow-2xl md:shadow-none transition-[transform,margin,border-width] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] overflow-hidden will-change-transform ${
            sidebarOpen
              ? "translate-x-0 w-72 md:w-64"
              : "-translate-x-full w-72 md:w-64 md:-ml-64 md:border-r-0"
          }`}
          style={{
            backgroundColor: "var(--drive-sidebar)",
            borderColor: "color-mix(in oklab, var(--color-ink) 15%, transparent)",
            color: "var(--color-cream)",
            ["--color-ink" as string]: "#ffffff",
            ["--sidebar-badge-fg" as string]: "#0c8397",
          }}
        >
          <div className="p-6 md:p-8 flex items-center gap-3 justify-between">
            <div className="flex items-center gap-2 min-w-0">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 165 227" className="w-auto shrink-0" style={{ height: "54px", marginTop: "-5px" }} fill="none" aria-hidden="true">
                <path fill="currentColor" d="M72.476 3.94C80.143-2.42 92.81-.847 98.89 6.98c5.026 6.266 5.533 14.693 5.853 22.386.133 12.854-.88 25.667-1.32 38.507 5.693-14.027 9-29.387 18.16-41.72 5.987-8.32 19.013-10.213 26.787-3.347 6.826 6.16 6.92 16.414 5.013 24.747-5.373 21.387-12.547 42.267-19.827 63.067 8.04 6.706 13.44 16.24 15.174 26.56 3.2 19.52-.067 40.493-11.054 57.173-9.333 14.547-24.213 25.493-41.093 29.467-21.293 5.266-45.307 3.2-63.693-9.467C15.556 202.553 5.05 182.86.983 162.66c-1.48-7.8-1.813-16.587 2.8-23.454 3.467-5.813 9.8-8.866 15.88-11.2-1.027-3.68-2.093-7.64-.787-11.4 1.28-4.253 5.08-6.96 8.627-9.266-4.72-18.6-11.293-36.72-15.933-55.374-2.16-8.36-4.56-17.586-.894-25.906 3.507-8.6 14.24-13 22.867-9.734 6.133 2.147 10.44 7.534 13.547 13.014 6.56 12.093 10.013 25.506 14.013 38.573.653-14.707 1.307-29.413 2.64-44.08.747-7.253 2.907-15.04 8.733-19.893m8.84 9.893c-3.533 4.773-3.546 11.027-4.16 16.693-1.613 23.094-2.613 46.214-3.8 69.32 4.92.08 9.827.107 14.747.107.84-24.88 2.52-49.733 2.347-74.627-.187-4.08-.6-8.733-3.68-11.746-1.427-1.627-4.24-1.627-5.454.253M22.85 33.206c-.334 8.267 2.346 16.214 4.52 24.094 4.36 15.146 8.933 30.253 13.506 45.346 5.147-.72 10.294-1.466 15.414-2.36-5.347-17.64-10.36-35.373-16.107-52.893-2.667-6.693-5-14.24-10.8-18.92-3.147-2.36-6.587 1.6-6.533 4.733m110.626-.506c-5.293 6.973-7.773 15.493-10.96 23.533-5.546 14.96-11.466 29.773-16.906 44.773 5.306.667 10.506 1.96 15.72 3.08 6.48-19.693 13.96-39.12 18.48-59.4 1.106-4.586.986-9.466-1.307-13.68-1.72.267-3.987-.093-5.027 1.694M58.01 113.006c-8.974.814-18.32 2.04-26.094 6.92.414 6.587 7.08 9.414 12.6 10.84 14 3.534 28.467 1.174 42.64.254 4.52-.04 9.747-.787 13.52 2.306 3.107 2.56 2.88 7.854-.28 10.28-4.8 4.16-10.293 7.507-14.68 12.134-8.16 7.866-12.84 19.586-11.28 30.92.454 4.44 3.96 8.306 3.107 12.88-.587 2.96-4.427 3.546-6.72 2.2-6.133-2.734-9.32-9.254-10.68-15.507-10.48 4.533-22.48.213-30.147-7.56-4.56-4.667-9.546-10.293-9.253-17.24.133-3.36 4.027-7.013 7.293-4.76 5.454 4.293 8.507 10.96 14.12 15.133 3.147 2.467 7.534 5.014 11.547 3.054 2.56-2.107 1.56-5.934.693-8.654-4.12-10.56-12.293-19.28-21.973-25.026-7.587-4.067-18.747 1.626-18.467 10.666.174 13.24 5.254 26.08 12.254 37.147 8.133 12.867 22.013 21.627 36.986 23.96 16.254 2.52 34 .347 47.654-9.387 15.746-10.96 24.453-30.066 25-48.96.32-10.746-.76-22.613-8.014-31.133-6.813-7.64-17.546-9.387-27.226-10.2-14.174-.893-28.427-1.293-42.6-.267m-.387 32.36a79.6 79.6 0 0 1 8.68 13.48c3.28-5.253 7.24-10.026 11.653-14.373-6.76.6-13.546.867-20.333.893"/>
              </svg>
              <WorkspaceAppSwitcher />
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
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className="w-full flex items-center justify-center gap-2 h-11 rounded-full text-sm font-medium transition-transform hover:-translate-y-0.5"
                  style={{
                    backgroundColor: "var(--color-ink)",
                    color: "var(--drive-sidebar)",
                    boxShadow:
                      "0 10px 24px -12px color-mix(in oklab, var(--color-ink) 60%, transparent)",
                  }}
                >
                  <Plus className="size-4" /> New
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" sideOffset={8} className="min-w-[14rem]">
                <DropdownMenuItem onClick={createFolder} className="cursor-pointer gap-2.5 py-2">
                  <FolderPlus className="size-4 opacity-70" />
                  <span>New folder</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => fileInputRef.current?.click()} className="cursor-pointer gap-2.5 py-2">
                  <Upload className="size-4 opacity-70" />
                  <span>Upload files</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => createBlank("doc")} className="cursor-pointer gap-2.5 py-2">
                  <FileText className="size-4 opacity-70" />
                  <span>New document</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => createBlank("sheet")} className="cursor-pointer gap-2.5 py-2">
                  <FileSpreadsheet className="size-4 opacity-70" />
                  <span>New spreadsheet</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => createBlank("slides")} className="cursor-pointer gap-2.5 py-2">
                  <Presentation className="size-4 opacity-70" />
                  <span>New presentation</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <nav className="flex-1 px-4 space-y-7 overflow-y-auto">
            <ul className="space-y-1">
              <SidebarLink
                active={view.type === "recent"}
                onClick={() => selectView({ type: "recent" })}
                icon={<Clock className="size-3.5" />}
              >
                Recent
              </SidebarLink>
              <SidebarLink
                active={view.type === "starred"}
                onClick={() => selectView({ type: "starred" })}
                icon={<Star className="size-3.5" />}
                badge={counts.starred || undefined}
              >
                Starred
              </SidebarLink>
              <SidebarLink
                active={view.type === "shared"}
                onClick={() => selectView({ type: "shared" })}
                icon={<Users className="size-3.5" />}
                badge={counts.shared || undefined}
              >
                Shared with me
              </SidebarLink>
            </ul>

            <SidebarGroup label="Locations">
              {TOP_FOLDERS.map((fld) => (
                <SidebarLink
                  key={fld}
                  active={view.type === "folder" && view.path === fld}
                  onClick={() => selectView({ type: "folder", path: fld })}
                  icon={topFolderIcon[fld]}
                  badge={
                    fld === "My Drive"
                      ? counts.myDrive || undefined
                      : fld === "Shared with me"
                        ? counts.shared || undefined
                        : counts.trash || undefined
                  }
                  isDropTarget={dropTarget === fld}
                  onDragOver={(e) => {
                    if (dragging) {
                      e.preventDefault();
                      setDropTarget(fld);
                    }
                  }}
                  onDragLeave={() => setDropTarget((t) => (t === fld ? null : t))}
                  onDrop={(e) => {
                    e.preventDefault();
                    dropOnFolder(fld);
                  }}
                >
                  {fld}
                </SidebarLink>
              ))}
            </SidebarGroup>
          </nav>

          <div
            className="p-4 md:p-6 flex items-center gap-2 shrink-0 border-t"
            style={{
              color: "color-mix(in oklab, var(--color-ink) 80%, transparent)",
              borderColor: "color-mix(in oklab, var(--color-ink) 18%, transparent)",
            }}
          >
            <div
              className="size-9 rounded-full flex items-center justify-center text-[11px] font-medium shrink-0"
              style={{
                backgroundColor: "color-mix(in oklab, var(--color-ink) 18%, transparent)",
                color: "var(--color-ink)",
              }}
            >
              EL
            </div>
            <div className="flex-1 min-w-0 text-sm truncate" style={{ color: "var(--color-ink)" }}>
              Elias Linden
            </div>
            <Tooltip>
              <TooltipTrigger asChild>
                <Link
                  to="/"
                  aria-label="Log out"
                  className="size-9 rounded-full flex items-center justify-center transition-colors hover:bg-[color-mix(in_oklab,var(--color-ink)_18%,transparent)]"
                  style={{
                    color: "var(--color-ink)",
                    backgroundColor: "color-mix(in oklab, var(--color-ink) 10%, transparent)",
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

        {/* Main browser */}
        <section
          className="flex-1 flex flex-col min-w-0 relative"
          style={{ backgroundColor: "var(--color-cream, #f5f1e8)" }}
        >
          <header
            className="px-4 md:px-8 pt-4 md:pt-6 pb-3 border-b shrink-0"
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

              {/* Breadcrumbs */}
              <nav className="flex-1 min-w-0 flex items-center gap-1 overflow-x-auto" aria-label="Breadcrumb">
                {breadcrumbs.map((b, i) => {
                  const isLast = i === breadcrumbs.length - 1;
                  return (
                    <span key={i} className="flex items-center gap-1 shrink-0">
                      {i > 0 && (
                        <ChevronRight
                          className="size-4 shrink-0"
                          style={{ color: "color-mix(in oklab, var(--color-ink) 35%, transparent)" }}
                        />
                      )}
                      {isLast || !b.path ? (
                        <span
                          className="text-2xl md:text-3xl leading-none truncate"
                          style={{ fontFamily: "var(--font-serif)", color: "var(--color-ink)" }}
                        >
                          {b.label}
                        </span>
                      ) : (
                        <button
                          onClick={() => selectView({ type: "folder", path: b.path! })}
                          className="text-2xl md:text-3xl leading-none truncate hover:underline underline-offset-4"
                          style={{
                            fontFamily: "var(--font-serif)",
                            color: "color-mix(in oklab, var(--color-ink) 55%, transparent)",
                          }}
                        >
                          {b.label}
                        </button>
                      )}
                    </span>
                  );
                })}
              </nav>

              <div className="flex items-center gap-1.5 shrink-0">
                <div
                  className="hidden sm:flex items-center rounded-full p-0.5"
                  style={{ backgroundColor: "color-mix(in oklab, var(--color-ink) 6%, transparent)" }}
                >
                  <button
                    aria-label="Grid view"
                    onClick={() => setViewMode("grid")}
                    className="size-8 rounded-full flex items-center justify-center transition-colors"
                    style={{
                      backgroundColor:
                        viewMode === "grid"
                          ? "var(--color-cream, #f5f1e8)"
                          : "transparent",
                      color: "var(--color-ink)",
                      boxShadow:
                        viewMode === "grid"
                          ? "0 1px 2px color-mix(in oklab, var(--color-ink) 20%, transparent)"
                          : "none",
                    }}
                  >
                    <LayoutGrid className="size-4" />
                  </button>
                  <button
                    aria-label="List view"
                    onClick={() => setViewMode("list")}
                    className="size-8 rounded-full flex items-center justify-center transition-colors"
                    style={{
                      backgroundColor:
                        viewMode === "list"
                          ? "var(--color-cream, #f5f1e8)"
                          : "transparent",
                      color: "var(--color-ink)",
                      boxShadow:
                        viewMode === "list"
                          ? "0 1px 2px color-mix(in oklab, var(--color-ink) 20%, transparent)"
                          : "none",
                    }}
                  >
                    <ListIcon className="size-4" />
                  </button>
                </div>
                <ListAction label={detailOpen ? "Hide details" : "Show details"} onClick={() => setDetailOpen((v) => !v)}>
                  <Info className="size-4" />
                </ListAction>
                {inTrashView && visibleItems.length > 0 && (
                  <ListAction
                    label="Empty trash"
                    onClick={() => setConfirmDelete({ ids: visibleItems.map((f) => f.id) })}
                  >
                    <Trash2 className="size-4" />
                  </ListAction>
                )}
              </div>
            </div>

            <div className="mt-3 flex items-center gap-3">
              <div
                className="flex-1 flex items-center gap-2 px-3 h-9 rounded-md max-w-md"
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
                  placeholder="Search in Drive…"
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
              <p
                className="text-[10px] uppercase tracking-[0.18em] shrink-0"
                style={{ color: "color-mix(in oklab, var(--color-ink) 45%, transparent)" }}
              >
                {selectionMode || selectedIds.length > 1
                  ? `${selectedIds.length} Selected`
                  : `${visibleItems.length} Items`}
              </p>
            </div>
          </header>

          {/* Content */}
          <div className="flex-1 flex min-h-0">
            <div className="flex-1 overflow-y-auto min-w-0">
              {visibleItems.length === 0 ? (
                <div
                  className="p-16 text-center text-sm"
                  style={{ color: "color-mix(in oklab, var(--color-ink) 50%, transparent)" }}
                >
                  <Cloud className="size-12 mx-auto mb-4 opacity-30" />
                  This folder is empty
                </div>
              ) : viewMode === "grid" ? (
                <GridView
                  items={visibleItems}
                  selectedIds={selectedIds}
                  starred={starred}
                  dragging={dragging}
                  dropTarget={dropTarget}
                  selectionMode={selectionMode}
                  isTouch={isTouch}
                  onSelect={handleSelect}
                  onOpen={openFile}
                  onLongPress={enterSelectionFor}
                  onStar={toggleStar}
                  onDragStart={startDrag}
                  onDragEnd={endDrag}
                  onDropOnFolder={(parentPath) => dropOnFolder(parentPath)}
                  setDropTarget={setDropTarget}
                />
              ) : (
                <ListView
                  items={visibleItems}
                  activeId={activeId}
                  selectedIds={selectedIds}
                  starred={starred}
                  dragging={dragging}
                  dropTarget={dropTarget}
                  selectionMode={selectionMode}
                  isTouch={isTouch}
                  inTrash={inTrashView}
                  onSelect={handleSelect}
                  onOpen={openFile}
                  onStar={toggleStar}
                  onArchive={(f) => moveOne(f.id, isUnderTrash(f.parent) ? "My Drive" : "Trash")}
                  onLongPress={enterSelectionFor}
                  onDragStart={startDrag}
                  onDragEnd={endDrag}
                  onDropOnFolder={(parentPath) => dropOnFolder(parentPath)}
                  setDropTarget={setDropTarget}
                />
              )}
            </div>

            {/* Detail side panel */}
            {detailOpen && active && (
              <aside
                className="hidden md:flex w-80 lg:w-96 shrink-0 border-l flex-col"
                style={{
                  backgroundColor: "var(--color-cream, #f5f1e8)",
                  borderColor: "color-mix(in oklab, var(--color-ink) 10%, transparent)",
                }}
              >
                <DetailPanel
                  file={active}
                  isStarred={!!starred[active.id]}
                  onClose={() => setDetailOpen(false)}
                  onStar={() => toggleStar(active.id)}
                  onMove={() => setMoveDialog({ ids: [active.id] })}
                  onDelete={() =>
                    isUnderTrash(active.parent)
                      ? setConfirmDelete({ ids: [active.id] })
                      : moveOne(active.id, "Trash")
                  }
                />
              </aside>
            )}
          </div>

          {/* Mobile detail overlay */}
          {detailOpen && active && (
            <div
              className="md:hidden fixed inset-0 z-50 flex flex-col"
              style={{ backgroundColor: "var(--color-cream, #f5f1e8)" }}
            >
              <DetailPanel
                file={active}
                isStarred={!!starred[active.id]}
                onClose={() => setDetailOpen(false)}
                onStar={() => toggleStar(active.id)}
                onMove={() => setMoveDialog({ ids: [active.id] })}
                onDelete={() =>
                  isUnderTrash(active.parent)
                    ? setConfirmDelete({ ids: [active.id] })
                    : moveOne(active.id, "Trash")
                }
                mobile
              />
            </div>
          )}

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
              <FabButton label="Download" onClick={() => toast("Download started", { icon: <Download className="size-4" /> })}>
                <Download className="size-4" />
              </FabButton>
              <FabButton label="Move to folder" onClick={() => setMoveDialog({ ids: selectedIds })}>
                <FolderInput className="size-4" />
              </FabButton>
              <FabButton label={inTrashView ? "Delete permanently" : "Move to trash"} onClick={requestDeleteSelected}>
                <Trash2 className="size-4" />
              </FabButton>
              <FabButton label="Done" onClick={exitSelection}>
                <X className="size-4" />
              </FabButton>
            </div>
          )}
        </section>

        <MoveToDialog
          open={!!moveDialog}
          onClose={() => setMoveDialog(null)}
          notebooks={allFolderPaths}
          onConfirm={(folder) => {
            if (moveDialog) moveToFolder(moveDialog.ids, folder);
            setMoveDialog(null);
          }}
        />

        <AlertDialog open={!!confirmDelete} onOpenChange={(o) => !o && setConfirmDelete(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete permanently?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete {confirmDelete?.ids.length} file
                {confirmDelete && confirmDelete.ids.length === 1 ? "" : "s"}. This cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
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

/* ---------------- Grid view ---------------- */

function GridView({
  items,
  selectedIds,
  starred,
  dragging,
  dropTarget,
  selectionMode,
  isTouch,
  onSelect,
  onOpen,
  onLongPress,
  onStar,
  onDragStart,
  onDragEnd,
  onDropOnFolder,
  setDropTarget,
}: {
  items: DriveFile[];
  selectedIds: string[];
  starred: Record<string, boolean>;
  dragging: string[] | null;
  dropTarget: string | null;
  selectionMode: boolean;
  isTouch: boolean;
  onSelect: (id: string, e: React.MouseEvent) => void;
  onOpen: (f: DriveFile) => void;
  onLongPress: (id: string) => void;
  onStar: (id: string) => void;
  onDragStart: (id: string) => void;
  onDragEnd: () => void;
  onDropOnFolder: (parentPath: string) => void;
  setDropTarget: (s: string | null) => void;
}) {
  const folders = items.filter((i) => i.kind === "folder");
  const files = items.filter((i) => i.kind !== "folder");

  return (
    <div className="p-4 md:p-8 space-y-8">
      {folders.length > 0 && (
        <Section title="Folders">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-3">
            {folders.map((f) => (
              <FolderTile
                key={f.id}
                file={f}
                isSelected={selectedIds.includes(f.id)}
                isStarred={!!starred[f.id]}
                isDragging={dragging?.includes(f.id) ?? false}
                isDropTarget={
                  dropTarget === (f.parent === "" ? f.title : `${f.parent}/${f.title}`)
                }
                isTouch={isTouch}
                onSelect={(e) => onSelect(f.id, e)}
                onOpen={() => onOpen(f)}
                onLongPress={() => onLongPress(f.id)}
                onStar={() => onStar(f.id)}
                onDragStart={() => onDragStart(f.id)}
                onDragEnd={onDragEnd}
                onDragOver={(e) => {
                  if (dragging) {
                    e.preventDefault();
                    setDropTarget(f.parent === "" ? f.title : `${f.parent}/${f.title}`);
                  }
                }}
                onDragLeave={() => setDropTarget(null)}
                onDrop={(e) => {
                  e.preventDefault();
                  onDropOnFolder(f.parent === "" ? f.title : `${f.parent}/${f.title}`);
                }}
              />
            ))}
          </div>
        </Section>
      )}

      {files.length > 0 && (
        <Section title="Files">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-3">
            {files.map((f) => (
              <FileTile
                key={f.id}
                file={f}
                isSelected={selectedIds.includes(f.id)}
                isStarred={!!starred[f.id]}
                isDragging={dragging?.includes(f.id) ?? false}
                isTouch={isTouch}
                onSelect={(e) => onSelect(f.id, e)}
                onOpen={() => onOpen(f)}
                onLongPress={() => onLongPress(f.id)}
                onStar={() => onStar(f.id)}
                onDragStart={() => onDragStart(f.id)}
                onDragEnd={onDragEnd}
              />
            ))}
          </div>
        </Section>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3
        className="text-[10px] uppercase tracking-[0.2em] font-semibold mb-3"
        style={{ color: "color-mix(in oklab, var(--color-ink) 55%, transparent)" }}
      >
        {title}
      </h3>
      {children}
    </div>
  );
}

function useLongPress(handler: () => void) {
  const t = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fired = useRef(false);
  return {
    fired,
    start: () => {
      fired.current = false;
      t.current = setTimeout(() => {
        fired.current = true;
        handler();
        if ("vibrate" in navigator) navigator.vibrate?.(15);
      }, 450);
    },
    cancel: () => {
      if (t.current) clearTimeout(t.current);
      t.current = null;
    },
  };
}

function FolderTile({
  file,
  isSelected,
  isStarred,
  isDragging,
  isDropTarget,
  isTouch,
  onSelect,
  onOpen,
  onLongPress,
  onStar,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDragLeave,
  onDrop,
}: {
  file: DriveFile;
  isSelected: boolean;
  isStarred: boolean;
  isDragging: boolean;
  isDropTarget: boolean;
  isTouch: boolean;
  onSelect: (e: React.MouseEvent) => void;
  onOpen: () => void;
  onLongPress: () => void;
  onStar: () => void;
  onDragStart: () => void;
  onDragEnd: () => void;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
}) {
  const lp = useLongPress(onLongPress);
  return (
    <button
      onClick={(e) => {
        if (lp.fired.current) return;
        onSelect(e);
      }}
      onDoubleClick={onOpen}
      onTouchStart={lp.start}
      onTouchEnd={lp.cancel}
      onTouchMove={lp.cancel}
      onContextMenu={(e) => {
        if (!isTouch) {
          e.preventDefault();
          onLongPress();
        }
      }}
      draggable={!isTouch}
      onDragStart={(e) => {
        onDragStart();
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData("text/plain", file.id);
      }}
      onDragEnd={onDragEnd}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      className={`group relative w-full text-left px-3 h-14 rounded-lg flex items-center gap-3 transition-all outline-none focus-visible:ring-2 ${
        isDragging ? "opacity-40" : ""
      }`}
      style={{
        backgroundColor: isDropTarget
          ? "color-mix(in oklab, var(--color-emerald) 22%, transparent)"
          : isSelected
            ? "color-mix(in oklab, var(--color-emerald) 18%, transparent)"
            : "color-mix(in oklab, var(--color-ink) 5%, transparent)",
        boxShadow: isDropTarget
          ? "inset 0 0 0 1.5px var(--color-emerald)"
          : isSelected
            ? "inset 0 0 0 1px color-mix(in oklab, var(--color-emerald) 45%, transparent)"
            : "none",
      }}
    >
      <Folder
        className="size-5 shrink-0"
        style={{ color: "var(--color-emerald)" }}
        fill="currentColor"
        fillOpacity={0.15}
      />
      <span
        className="flex-1 min-w-0 truncate text-sm font-medium"
        style={{ color: "var(--color-ink)" }}
      >
        {file.title}
      </span>
      {isStarred && (
        <Star
          className="size-3.5 shrink-0"
          fill="currentColor"
          style={{ color: "var(--color-emerald)" }}
        />
      )}
    </button>
  );
}

function FileTile({
  file,
  isSelected,
  isStarred,
  isDragging,
  isTouch,
  onSelect,
  onOpen,
  onLongPress,
  onStar,
  onDragStart,
  onDragEnd,
}: {
  file: DriveFile;
  isSelected: boolean;
  isStarred: boolean;
  isDragging: boolean;
  isTouch: boolean;
  onSelect: (e: React.MouseEvent) => void;
  onOpen: () => void;
  onLongPress: () => void;
  onStar: () => void;
  onDragStart: () => void;
  onDragEnd: () => void;
}) {
  const lp = useLongPress(onLongPress);
  return (
    <div
      onClick={(e) => {
        if (lp.fired.current) return;
        onSelect(e);
      }}
      onDoubleClick={onOpen}
      onTouchStart={lp.start}
      onTouchEnd={lp.cancel}
      onTouchMove={lp.cancel}
      onContextMenu={(e) => {
        if (!isTouch) {
          e.preventDefault();
          onLongPress();
        }
      }}
      draggable={!isTouch}
      onDragStart={(e) => {
        onDragStart();
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData("text/plain", file.id);
      }}
      onDragEnd={onDragEnd}
      role="button"
      tabIndex={0}
      className={`group relative rounded-xl overflow-hidden transition-all cursor-pointer outline-none ${
        isDragging ? "opacity-40" : ""
      }`}
      style={{
        backgroundColor: "color-mix(in oklab, var(--color-ink) 5%, transparent)",
        boxShadow: isSelected
          ? "inset 0 0 0 2px var(--color-emerald)"
          : "inset 0 0 0 1px color-mix(in oklab, var(--color-ink) 8%, transparent)",
      }}
    >
      <div
        className="aspect-[4/3] flex items-center justify-center"
        style={{
          backgroundColor: "color-mix(in oklab, var(--drive-sidebar) 8%, transparent)",
          color: "var(--drive-sidebar)",
        }}
      >
        <span className="[&>svg]:size-12 opacity-80">{kindIconLg[file.kind]}</span>
      </div>
      <div
        className="px-3 py-2.5 flex items-center gap-2 border-t"
        style={{
          borderColor: "color-mix(in oklab, var(--color-ink) 8%, transparent)",
          backgroundColor: "var(--color-cream, #f5f1e8)",
        }}
      >
        <span className="shrink-0" style={{ color: "var(--color-emerald)" }}>
          {kindIcon[file.kind]}
        </span>
        <span
          className="flex-1 min-w-0 truncate text-[13px] font-medium"
          style={{ color: "var(--color-ink)" }}
        >
          {file.title}
        </span>
        <button
          aria-label={isStarred ? "Unstar" : "Star"}
          onClick={(e) => {
            e.stopPropagation();
            onStar();
          }}
          className="size-6 rounded-full flex items-center justify-center transition-opacity"
          style={{
            opacity: isStarred ? 1 : 0,
            color: "var(--color-emerald)",
          }}
        >
          <Star className="size-3.5" fill="currentColor" />
        </button>
      </div>
    </div>
  );
}

/* ---------------- List view (OS-style table) ---------------- */

const KIND_LABEL: Record<FileKind, string> = {
  folder: "Folder",
  doc: "Document",
  image: "Image",
  video: "Video",
  audio: "Audio",
  archive: "Archive",
  file: "File",
};

function ListView({
  items,
  activeId,
  selectedIds,
  starred,
  dragging,
  isTouch,
  onSelect,
  onOpen,
  onStar,
  onLongPress,
  onDragStart,
  onDragEnd,
  onDropOnFolder,
  setDropTarget,
  dropTarget,
}: {
  items: DriveFile[];
  activeId: string | null;
  selectedIds: string[];
  starred: Record<string, boolean>;
  dragging: string[] | null;
  dropTarget: string | null;
  selectionMode: boolean;
  isTouch: boolean;
  inTrash: boolean;
  onSelect: (id: string, e: React.MouseEvent) => void;
  onOpen: (f: DriveFile) => void;
  onStar: (id: string) => void;
  onArchive: (f: DriveFile) => void;
  onLongPress: (id: string) => void;
  onDragStart: (id: string) => void;
  onDragEnd: () => void;
  onDropOnFolder: (parentPath: string) => void;
  setDropTarget: (s: string | null) => void;
}) {
  const headBorder = "color-mix(in oklab, var(--color-ink) 12%, transparent)";
  const rowBorder = "color-mix(in oklab, var(--color-ink) 6%, transparent)";
  const muted = "color-mix(in oklab, var(--color-ink) 60%, transparent)";
  const headMuted = "color-mix(in oklab, var(--color-ink) 50%, transparent)";

  return (
    <div className="px-2 md:px-6 pb-8">
      <table className="w-full text-sm" style={{ color: "var(--color-ink)" }}>
        <thead>
          <tr
            className="text-left"
            style={{
              borderBottom: `1px solid ${headBorder}`,
              color: headMuted,
            }}
          >
            <th className="font-medium uppercase tracking-[0.14em] text-[10px] py-2.5 px-3 w-[44%]">Name</th>
            <th className="font-medium uppercase tracking-[0.14em] text-[10px] py-2.5 px-3 hidden md:table-cell">Owner</th>
            <th className="font-medium uppercase tracking-[0.14em] text-[10px] py-2.5 px-3 hidden sm:table-cell">Modified</th>
            <th className="font-medium uppercase tracking-[0.14em] text-[10px] py-2.5 px-3 hidden lg:table-cell">Kind</th>
            <th className="font-medium uppercase tracking-[0.14em] text-[10px] py-2.5 px-3 text-right">Size</th>
          </tr>
        </thead>
        <tbody>
          {items.map((f) => {
            const folderPath = f.parent === "" ? f.title : `${f.parent}/${f.title}`;
            const isSelected = selectedIds.includes(f.id);
            const isActive = f.id === activeId;
            const isDropTarget = f.kind === "folder" && dropTarget === folderPath;
            const isDragging = dragging?.includes(f.id) ?? false;
            const lp = {
              start: undefined as undefined | (() => void),
              cancel: undefined as undefined | (() => void),
            };
            let pressTimer: ReturnType<typeof setTimeout> | null = null;
            const longPressStart = () => {
              pressTimer = setTimeout(() => onLongPress(f.id), 450);
            };
            const longPressCancel = () => {
              if (pressTimer) clearTimeout(pressTimer);
              pressTimer = null;
            };
            lp.start = longPressStart;
            lp.cancel = longPressCancel;

            return (
              <tr
                key={f.id}
                onClick={(e) => onSelect(f.id, e)}
                onDoubleClick={() => onOpen(f)}
                onTouchStart={lp.start}
                onTouchEnd={lp.cancel}
                onTouchMove={lp.cancel}
                onContextMenu={(e) => {
                  if (!isTouch) {
                    e.preventDefault();
                    onLongPress(f.id);
                  }
                }}
                draggable={!isTouch}
                onDragStart={(e) => {
                  onDragStart(f.id);
                  e.dataTransfer.effectAllowed = "move";
                  e.dataTransfer.setData("text/plain", f.id);
                }}
                onDragEnd={onDragEnd}
                onDragOver={
                  f.kind === "folder"
                    ? (e) => {
                        if (dragging) {
                          e.preventDefault();
                          setDropTarget(folderPath);
                        }
                      }
                    : undefined
                }
                onDragLeave={
                  f.kind === "folder" ? () => setDropTarget(null) : undefined
                }
                onDrop={
                  f.kind === "folder"
                    ? (e) => {
                        e.preventDefault();
                        onDropOnFolder(folderPath);
                      }
                    : undefined
                }
                className={`group cursor-default transition-colors ${isDragging ? "opacity-40" : ""}`}
                style={{
                  borderBottom: `1px solid ${rowBorder}`,
                  backgroundColor: isDropTarget
                    ? "color-mix(in oklab, var(--color-emerald) 18%, transparent)"
                    : isSelected
                      ? "color-mix(in oklab, var(--color-emerald) 16%, transparent)"
                      : isActive
                        ? "color-mix(in oklab, var(--color-ink) 8%, transparent)"
                        : "transparent",
                  boxShadow: isDropTarget
                    ? `inset 0 0 0 1.5px var(--color-emerald)`
                    : "none",
                }}
              >
                <td className="py-2 px-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span
                      className="shrink-0 [&>svg]:size-4"
                      style={{
                        color:
                          f.kind === "folder"
                            ? "var(--color-emerald)"
                            : "var(--drive-sidebar)",
                      }}
                    >
                      {f.kind === "folder" ? (
                        <Folder className="size-4" fill="currentColor" fillOpacity={0.18} />
                      ) : (
                        kindIcon[f.kind]
                      )}
                    </span>
                    <span className="truncate font-medium">{f.title}</span>
                    {starred[f.id] && (
                      <Star
                        className="size-3 shrink-0"
                        fill="currentColor"
                        style={{ color: "var(--color-emerald)" }}
                      />
                    )}
                    <button
                      aria-label={starred[f.id] ? "Unstar" : "Star"}
                      onClick={(e) => {
                        e.stopPropagation();
                        onStar(f.id);
                      }}
                      className="ml-auto size-6 rounded-full opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"
                      style={{ color: muted }}
                    >
                      <Star className="size-3.5" fill={starred[f.id] ? "currentColor" : "none"} />
                    </button>
                  </div>
                </td>
                <td className="py-2 px-3 hidden md:table-cell" style={{ color: muted }}>
                  {f.owner}
                </td>
                <td className="py-2 px-3 hidden sm:table-cell tabular-nums" style={{ color: muted }}>
                  {f.date}
                </td>
                <td className="py-2 px-3 hidden lg:table-cell" style={{ color: muted }}>
                  {KIND_LABEL[f.kind]}
                </td>
                <td className="py-2 px-3 text-right tabular-nums" style={{ color: muted }}>
                  {f.size}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/* ---------------- Detail panel ---------------- */

function DetailPanel({
  file,
  isStarred,
  onClose,
  onStar,
  onMove,
  onDelete,
  mobile,
}: {
  file: DriveFile;
  isStarred: boolean;
  onClose: () => void;
  onStar: () => void;
  onMove: () => void;
  onDelete: () => void;
  mobile?: boolean;
}) {
  return (
    <>
      <div
        className="px-4 md:px-6 h-14 md:h-16 border-b flex items-center justify-between shrink-0"
        style={{ borderColor: "color-mix(in oklab, var(--color-ink) 10%, transparent)" }}
      >
        <button
          aria-label="Close"
          onClick={onClose}
          className="size-9 rounded-full flex items-center justify-center"
          style={{
            color: "var(--color-ink)",
            backgroundColor: "color-mix(in oklab, var(--color-ink) 6%, transparent)",
          }}
        >
          {mobile ? <ArrowLeft className="size-4" /> : <X className="size-4" />}
        </button>
        <div className="flex items-center gap-1.5">
          <ListAction label="Download" onClick={() => toast("Download started", { icon: <Download className="size-4" /> })}>
            <Download className="size-4" />
          </ListAction>
          <ListAction label="Share" onClick={() => toast("Share link copied", { icon: <Share2 className="size-4" /> })}>
            <Share2 className="size-4" />
          </ListAction>
          <ListAction label={isStarred ? "Unstar" : "Star"} onClick={onStar}>
            <Star className="size-4" fill={isStarred ? "currentColor" : "none"} />
          </ListAction>
          <ListAction label="Move" onClick={onMove}>
            <FolderInput className="size-4" />
          </ListAction>
          <ListAction label="Delete" onClick={onDelete}>
            <Trash2 className="size-4" />
          </ListAction>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto px-5 md:px-6 py-6">
        <div
          className="aspect-[4/3] rounded-2xl flex items-center justify-center mb-6"
          style={{
            backgroundColor: "color-mix(in oklab, var(--drive-sidebar) 14%, transparent)",
            color: "var(--drive-sidebar)",
          }}
        >
          <span className="[&>svg]:size-16">{kindIconLg[file.kind]}</span>
        </div>
        <p
          className="text-[10px] uppercase tracking-[0.18em] mb-2"
          style={{ color: "var(--drive-sidebar)" }}
        >
          {file.parent}
        </p>
        <h1
          className="text-2xl md:text-3xl leading-tight mb-4 tracking-tight break-words font-semibold"
          style={{ fontFamily: "var(--font-sans)", color: "var(--color-ink)" }}
        >
          {file.title}
        </h1>
        <dl className="space-y-2 text-sm mb-6">
          <Row label="Type" value={file.kind} />
          <Row label="Size" value={file.size} />
          <Row label="Owner" value={file.owner} />
          <Row label="Modified" value={file.date} />
        </dl>
        {file.body.map((p, i) => (
          <p
            key={i}
            className="text-sm leading-relaxed mb-3"
            style={{ color: "color-mix(in oklab, var(--color-ink) 78%, transparent)" }}
          >
            {p}
          </p>
        ))}
      </div>
    </>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 py-1.5 border-b" style={{ borderColor: "color-mix(in oklab, var(--color-ink) 8%, transparent)" }}>
      <dt
        className="text-[11px] uppercase tracking-wider"
        style={{ color: "color-mix(in oklab, var(--color-ink) 50%, transparent)" }}
      >
        {label}
      </dt>
      <dd className="capitalize" style={{ color: "var(--color-ink)" }}>
        {value}
      </dd>
    </div>
  );
}
