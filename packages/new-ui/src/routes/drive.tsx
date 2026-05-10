import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  Star,
  Trash2,
  X,
  Search,
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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/ui/tooltip";
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
import { createPwaHead } from "@/lib/pwa-head";
import { DriveApp } from "@/drive-core/src/drive-app";
import type { DriveAPIOperations, DriveUIData } from "@/drive-core/src/drive-types";
import { parentAndName, pathFromDirectoryEntry } from "@/lib/api/wgw/drive";
import { AppSidebar, AppSidebarScrim } from "@/app-sidebar/src/app-sidebar";
import {
  WorkspaceAppLayout,
  WorkspaceSidebarToggle,
  WorkspaceUserFooter,
} from "@/workspace-shell/src/workspace-app-layout";
import { workspaceUserInitials } from "@/lib/workspace/workspace-session";
import type { WorkspaceSession } from "@/lib/workspace/workspace-session";

export const Route = createFileRoute("/drive")({
  component: DriveRoute,
  head: () =>
    createPwaHead({
      title: "Drive",
      description: "Files and folders, organized.",
      themeColor: "#0c8397",
      appTitle: "Drive",
      manifest: "/manifests/drive.webmanifest",
      icon180: "/icons/drive-180.png",
      icon192: "/icons/drive-192.png",
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
  apiPath?: string;
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

type DriveWorkspaceProps = {
  data: DriveUIData;
  session: WorkspaceSession;
  operations?: DriveAPIOperations;
  listLoading?: boolean;
};

function rootLabelFromPath(path: string): TopFolder {
  if (path === "/groups" || path.startsWith("/groups/")) return "Shared with me";
  return "My Drive";
}

function uiPathFromApiPath(path: string): string {
  if (path === "/groups" || path.startsWith("/groups/")) {
    return path.replace(/^\/groups/, "Shared with me");
  }
  if (path === "/users" || path.startsWith("/users/")) {
    return path.replace(/^\/users/, "My Drive");
  }
  return "My Drive";
}

function apiPathFromUiPath(path: string): string {
  if (path === "Shared with me" || path.startsWith("Shared with me/")) {
    return path.replace(/^Shared with me/, "/groups");
  }
  if (path === "My Drive" || path.startsWith("My Drive/")) {
    return path.replace(/^My Drive/, "/users");
  }
  if (path === "Trash" || path.startsWith("Trash/")) {
    return "/users";
  }
  return "/users";
}

function driveFileFromEntry(entry: DriveUIData["directory"]["files"][number]): DriveFile {
  const apiPath = pathFromDirectoryEntry(entry);
  const parentApiPath = parentAndName(apiPath).destination;
  const parent = uiPathFromApiPath(parentApiPath);
  const kind: FileKind = entry.type === "dir" ? "folder" : "file";
  const date = entry.time > 0 ? new Date(entry.time * 1000).toLocaleDateString() : "Now";
  const size =
    entry.type === "dir"
      ? "—"
      : entry.size > 0
        ? `${Math.max(1, Math.round(entry.size / 1024))} KB`
        : "0 KB";
  return {
    id: apiPath,
    notebook: entry.type === "dir" ? "Folder" : `File · ${size}`,
    category: entry.type === "dir" ? "Folder" : "File",
    date,
    title: entry.name,
    excerpt: entry.path,
    body: [],
    tags: [],
    wordCount: 0,
    parent,
    kind,
    size,
    owner: "You",
    apiPath,
  };
}

function DriveRoute() {
  return <DriveApp renderWorkspace={(props) => <DriveWorkspace {...props} />} />;
}

export function DriveWorkspace({
  data,
  session,
  operations,
  listLoading = false,
}: DriveWorkspaceProps) {
  const [files, setFiles] = useState<DriveFile[]>(
    operations ? data.directory.files.map((entry) => driveFileFromEntry(entry)) : INITIAL_FILES,
  );
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
  const [liveSearchResults, setLiveSearchResults] = useState<DriveFile[] | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!operations) return;
    setFiles(data.directory.files.map((entry) => driveFileFromEntry(entry)));
    setView({ type: "folder", path: uiPathFromApiPath(data.cwd) });
  }, [data, operations]);

  useEffect(() => {
    if (!operations) return;
    const query = searchQuery.trim();
    if (!query) {
      setLiveSearchResults(null);
      return;
    }
    let cancelled = false;
    const timeout = window.setTimeout(() => {
      void operations
        .search(query, { limit: 200 })
        .then((entries) => {
          if (!cancelled) {
            setLiveSearchResults(entries.map((entry) => driveFileFromEntry(entry)));
          }
        })
        .catch((error: unknown) => {
          if (cancelled) return;
          const message = error instanceof Error ? error.message : String(error);
          toast.error(message);
        });
    }, 180);

    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
    };
  }, [operations, searchQuery]);

  const isTouch = useIsTouch();

  const inTrashView = view.type === "folder" && view.path === "Trash";

  const isUnderTrash = (parent: string) => parent === "Trash" || parent.startsWith("Trash/");

  const visibleItems = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const sourceFiles = liveSearchResults ?? files;
    const filtered = sourceFiles.filter((f) => {
      let inView = false;
      if (liveSearchResults) inView = true;
      else if (view.type === "folder") inView = f.parent === view.path;
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
  }, [files, liveSearchResults, view, starred, searchQuery]);

  const breadcrumbs = useMemo(() => {
    if (view.type !== "folder") {
      return [
        {
          label:
            view.type === "recent"
              ? "Recent"
              : view.type === "starred"
                ? "Starred"
                : "Shared with me",
          path: null as string | null,
        },
      ];
    }
    const parts = view.path.split("/");
    return parts.map((p, i) => ({ label: p, path: parts.slice(0, i + 1).join("/") }));
  }, [view]);

  const viewLabel = breadcrumbs[breadcrumbs.length - 1].label;
  const viewResetKey = view.type === "folder" ? `${view.type}:${view.path}` : view.type;

  useEffect(() => {
    setSelectedIds([]);
    setActiveId(null);
    setSelectionMode(false);
    setDetailOpen(false);
  }, [viewResetKey]);

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

  const active = activeId ? (files.find((f) => f.id === activeId) ?? null) : null;

  const openFile = (f: DriveFile) => {
    if (f.kind === "folder") {
      const next = f.parent === "" ? f.title : `${f.parent}/${f.title}`;
      setView({ type: "folder", path: next });
      if (operations) {
        void operations
          .changeDir(f.apiPath ?? apiPathFromUiPath(next))
          .then((nextData) => {
            setFiles(nextData.directory.files.map((entry) => driveFileFromEntry(entry)));
            setView({ type: "folder", path: uiPathFromApiPath(nextData.cwd) });
          })
          .catch((error: unknown) => {
            const message = error instanceof Error ? error.message : String(error);
            toast.error(message);
          });
      }
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
        icon: next ? (
          <Star className="size-4" fill="currentColor" />
        ) : (
          <StarOff className="size-4" />
        ),
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
        icon: allStarred ? (
          <StarOff className="size-4" />
        ) : (
          <Star className="size-4" fill="currentColor" />
        ),
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
    toast(`Moved ${ids.length} to ${parent.split("/").pop()}`, {
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
  const dropOnFolder = (parent: string) => {
    if (!dragging) return;
    moveToFolder(
      dragging.filter((id) => !parent.startsWith(id)),
      parent,
    );
    endDrag();
  };

  const requestDeleteSelected = () => {
    if (selectedIds.length === 0) return;
    if (inTrashView) setConfirmDelete({ ids: selectedIds });
    else batchTrash();
  };
  const reallyDelete = (ids: string[]) => {
    if (operations) {
      const apiPaths = files
        .filter((file) => ids.includes(file.id))
        .map((file) => file.apiPath)
        .filter((path): path is string => typeof path === "string");
      if (apiPaths.length > 0) {
        void operations
          .deleteItems(apiPaths)
          .then((nextData) => {
            setFiles(nextData.directory.files.map((entry) => driveFileFromEntry(entry)));
            setView({ type: "folder", path: uiPathFromApiPath(nextData.cwd) });
          })
          .catch((error: unknown) => {
            const message = error instanceof Error ? error.message : String(error);
            toast.error(message);
          });
      }
    }
    setFiles((p) => p.filter((f) => !ids.includes(f.id)));
    setSelectedIds((p) => p.filter((id) => !ids.includes(id)));
    setSelectionMode(false);
    if (activeId && ids.includes(activeId)) {
      setActiveId(null);
      setDetailOpen(false);
    }
    toast(`Deleted ${ids.length} file${ids.length === 1 ? "" : "s"}`, {
      icon: <Trash2 className="size-4" />,
    });
  };

  const handleUpload = (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    if (operations) {
      void operations.checkUploadReady().catch((error: unknown) => {
        const message = error instanceof Error ? error.message : String(error);
        toast.error(message);
      });
    }
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
    if (operations) {
      void operations
        .createFolder({ cwd: apiPathFromUiPath(targetParent), name: v })
        .then((nextData) => {
          setFiles(nextData.directory.files.map((entry) => driveFileFromEntry(entry)));
          setView({ type: "folder", path: uiPathFromApiPath(nextData.cwd) });
        })
        .catch((error: unknown) => {
          const message = error instanceof Error ? error.message : String(error);
          toast.error(message);
        });
    }
  };

  const createBlank = (kind: "doc" | "sheet" | "slides") => {
    const meta =
      kind === "doc"
        ? {
            title: "Untitled document.docx",
            category: "Document",
            note: "Doc · 0 KB",
            k: "doc" as FileKind,
          }
        : kind === "sheet"
          ? {
              title: "Untitled spreadsheet.xlsx",
              category: "Spreadsheet",
              note: "Sheet · 0 KB",
              k: "doc" as FileKind,
            }
          : {
              title: "Untitled presentation.pptx",
              category: "Presentation",
              note: "Slides · 0 KB",
              k: "doc" as FileKind,
            };
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
    setLiveSearchResults(null);
    if (operations && v.type === "folder") {
      void operations
        .changeDir(apiPathFromUiPath(v.path))
        .then((nextData) => {
          setFiles(nextData.directory.files.map((entry) => driveFileFromEntry(entry)));
          setView({ type: "folder", path: uiPathFromApiPath(nextData.cwd) });
        })
        .catch((error: unknown) => {
          const message = error instanceof Error ? error.message : String(error);
          toast.error(message);
        });
    }
    if (typeof window !== "undefined" && window.matchMedia("(max-width: 767px)").matches) {
      setSidebarOpen(false);
    }
  };

  useEffect(() => {
    const isMac =
      typeof navigator !== "undefined" && /Mac|iPhone|iPad|iPod/.test(navigator.platform);
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const inField =
        !!target && (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName));
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
        if (inTrashView) setConfirmDelete({ ids: selectedIds });
        else {
          setFiles((p) =>
            p.map((f) => (selectedIds.includes(f.id) ? { ...f, parent: "Trash" } : f)),
          );
          toast(`Moved ${selectedIds.length} to Trash`, {
            icon: <Trash2 className="size-4" />,
          });
        }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [selectedIds, detailOpen, inTrashView]);

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
      <WorkspaceAppLayout
        className="notes-root"
        style={{
          ["--color-emerald" as string]: "#0c8397",
          ["--drive-sidebar" as string]: "#0c8397",
          ["--app-sidebar-bg" as string]: "var(--drive-sidebar)",
          ["--app-sidebar-border-color" as string]: "color-mix(in oklab, #ffffff 18%, transparent)",
          ["--app-sidebar-color" as string]: "#ffffff",
          ["--sidebar-badge-fg" as string]: "#0c8397",
          ["--workspace-sidebar-toggle-color" as string]: "var(--color-ink)",
          ["--workspace-sidebar-toggle-bg" as string]:
            "color-mix(in oklab, var(--color-ink) 6%, transparent)",
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
        <AppSidebar
          open={sidebarOpen}
          onCloseMobile={() => setSidebarOpen(false)}
          appSwitcher={<WorkspaceAppSwitcher />}
        >
          <div className="flex h-full flex-col" style={{ ["--color-ink" as string]: "#ffffff" }}>
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
                  <DropdownMenuItem
                    onClick={() => fileInputRef.current?.click()}
                    className="cursor-pointer gap-2.5 py-2"
                  >
                    <Upload className="size-4 opacity-70" />
                    <span>Upload files</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => createBlank("doc")}
                    className="cursor-pointer gap-2.5 py-2"
                  >
                    <FileText className="size-4 opacity-70" />
                    <span>New document</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => createBlank("sheet")}
                    className="cursor-pointer gap-2.5 py-2"
                  >
                    <FileSpreadsheet className="size-4 opacity-70" />
                    <span>New spreadsheet</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => createBlank("slides")}
                    className="cursor-pointer gap-2.5 py-2"
                  >
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

            <WorkspaceUserFooter
              name={session.user.displayName}
              initials={workspaceUserInitials(session.user)}
              detailLine={session.user.username}
              onLogoutClick={() => window.location.assign("/")}
              linkHoverClassName="hover:bg-[color-mix(in_oklab,var(--color-ink)_18%,transparent)]"
            />
          </div>
        </AppSidebar>
        <AppSidebarScrim open={sidebarOpen} onClick={() => setSidebarOpen(false)} />

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
              <WorkspaceSidebarToggle
                open={sidebarOpen}
                onToggle={() => setSidebarOpen((v) => !v)}
                hoverClassName="hover:bg-[color-mix(in_oklab,var(--color-ink)_12%,transparent)]"
              />

              {/* Breadcrumbs */}
              <nav
                className="flex-1 min-w-0 flex items-center gap-1 overflow-x-auto"
                aria-label="Breadcrumb"
              >
                {breadcrumbs.map((b, i) => {
                  const isLast = i === breadcrumbs.length - 1;
                  return (
                    <span key={i} className="flex items-center gap-1 shrink-0">
                      {i > 0 && (
                        <ChevronRight
                          className="size-4 shrink-0"
                          style={{
                            color: "color-mix(in oklab, var(--color-ink) 35%, transparent)",
                          }}
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
                  style={{
                    backgroundColor: "color-mix(in oklab, var(--color-ink) 6%, transparent)",
                  }}
                >
                  <button
                    aria-label="Grid view"
                    onClick={() => setViewMode("grid")}
                    className="size-8 rounded-full flex items-center justify-center transition-colors"
                    style={{
                      backgroundColor:
                        viewMode === "grid" ? "var(--color-cream, #f5f1e8)" : "transparent",
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
                        viewMode === "list" ? "var(--color-cream, #f5f1e8)" : "transparent",
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
                <ListAction
                  label={detailOpen ? "Hide details" : "Show details"}
                  onClick={() => setDetailOpen((v) => !v)}
                >
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
                  onDownload={() => {
                    if (operations && active.apiPath && active.kind !== "folder") {
                      void operations.downloadFile(active.apiPath).catch((error: unknown) => {
                        const message = error instanceof Error ? error.message : String(error);
                        toast.error(message);
                      });
                    }
                  }}
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
                onDownload={() => {
                  if (operations && active.apiPath && active.kind !== "folder") {
                    void operations.downloadFile(active.apiPath).catch((error: unknown) => {
                      const message = error instanceof Error ? error.message : String(error);
                      toast.error(message);
                    });
                  }
                }}
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
              <FabButton
                label="Download"
                onClick={() => {
                  const first = files.find(
                    (file) => selectedIds.includes(file.id) && file.kind !== "folder",
                  );
                  if (operations && first?.apiPath) {
                    void operations.downloadFile(first.apiPath).catch((error: unknown) => {
                      const message = error instanceof Error ? error.message : String(error);
                      toast.error(message);
                    });
                  }
                  toast("Download started", { icon: <Download className="size-4" /> });
                }}
              >
                <Download className="size-4" />
              </FabButton>
              <FabButton label="Move to folder" onClick={() => setMoveDialog({ ids: selectedIds })}>
                <FolderInput className="size-4" />
              </FabButton>
              <FabButton
                label={inTrashView ? "Delete permanently" : "Move to trash"}
                onClick={requestDeleteSelected}
              >
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
      </WorkspaceAppLayout>
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
                isDropTarget={dropTarget === (f.parent === "" ? f.title : `${f.parent}/${f.title}`)}
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
            <th className="font-medium uppercase tracking-[0.14em] text-[10px] py-2.5 px-3 w-[44%]">
              Name
            </th>
            <th className="font-medium uppercase tracking-[0.14em] text-[10px] py-2.5 px-3 hidden md:table-cell">
              Owner
            </th>
            <th className="font-medium uppercase tracking-[0.14em] text-[10px] py-2.5 px-3 hidden sm:table-cell">
              Modified
            </th>
            <th className="font-medium uppercase tracking-[0.14em] text-[10px] py-2.5 px-3 hidden lg:table-cell">
              Kind
            </th>
            <th className="font-medium uppercase tracking-[0.14em] text-[10px] py-2.5 px-3 text-right">
              Size
            </th>
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
                onDragLeave={f.kind === "folder" ? () => setDropTarget(null) : undefined}
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
                  boxShadow: isDropTarget ? `inset 0 0 0 1.5px var(--color-emerald)` : "none",
                }}
              >
                <td className="py-2 px-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span
                      className="shrink-0 [&>svg]:size-4"
                      style={{
                        color:
                          f.kind === "folder" ? "var(--color-emerald)" : "var(--drive-sidebar)",
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
                <td
                  className="py-2 px-3 hidden sm:table-cell tabular-nums"
                  style={{ color: muted }}
                >
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
  onDownload,
  onStar,
  onMove,
  onDelete,
  mobile,
}: {
  file: DriveFile;
  isStarred: boolean;
  onClose: () => void;
  onDownload: () => void;
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
          <ListAction
            label="Download"
            onClick={() => {
              onDownload();
              toast("Download started", { icon: <Download className="size-4" /> });
            }}
          >
            <Download className="size-4" />
          </ListAction>
          <ListAction
            label="Share"
            onClick={() => toast("Share link copied", { icon: <Share2 className="size-4" /> })}
          >
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
    <div
      className="flex justify-between gap-4 py-1.5 border-b"
      style={{ borderColor: "color-mix(in oklab, var(--color-ink) 8%, transparent)" }}
    >
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
