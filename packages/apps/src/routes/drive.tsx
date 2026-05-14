import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  Star,
  Trash2,
  X,
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
  MoreHorizontal,
  Pencil,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/ui/dropdown-menu";
import { Input } from "@/ui/input";
import {
  FAB_ICON_BUTTON_CLASSNAME,
  FAB_ICON_BUTTON_STYLE,
  LIST_ICON_BUTTON_STYLE,
} from "@/button/src/icon-button-presets";
import { Button, IconButton } from "@/button/src/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/ui/dialog";
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
import { WorkspaceAppSwitcher } from "@/workspace-app-switcher/src/workspace-app-switcher";
import { ListHeader } from "@/list-header/src/list-header";
import { createPwaHead } from "@/lib/pwa-head";
import { DriveApp } from "@/drive-core/src/drive-app";
import type {
  DriveAPIOperations,
  DriveUIData,
  DriveUploadProgress,
} from "@/drive-core/src/drive-types";
import { parentAndName, pathFromDirectoryEntry } from "@/lib/api/wgw/drive";
import { AppSidebar, AppSidebarScrim } from "@/app-sidebar/src/app-sidebar";
import {
  WorkspaceAppLayout,
  WorkspaceUserFooter,
} from "@/workspace-shell/src/workspace-app-layout";
import { workspaceUserInitials } from "@/lib/workspace/workspace-session";
import type { WorkspaceSession } from "@/lib/workspace/workspace-session";
import { requireWgwAuth } from "@/lib/api/wgw/route-guard";
import { wgwEnsureOfficeSession } from "@/lib/api/wgw/http";

export const Route = createFileRoute("/drive")({
  beforeLoad: ({ location }) => {
    requireWgwAuth(location);
  },
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

const OFFICE_EDITOR_EXTENSIONS = new Set(["docx", "xlsx", "pptx", "pdf"]);

type DriveWorkspaceProps = {
  data: DriveUIData;
  session: WorkspaceSession;
  operations?: DriveAPIOperations;
  listLoading?: boolean;
};

function normalizeApiVirtualPath(path: string): string {
  const trimmed = path.trim();
  if (!trimmed || trimmed === "/") return "/";
  const withLeading = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  return withLeading.replace(/\/+$/, "");
}

function uiPathFromApiPath(path: string, username: string): string {
  const normalized = normalizeApiVirtualPath(path);
  const userRoot = `/users/${username}`;
  if (normalized === "/groups") {
    return "Groups";
  }
  if (normalized.startsWith("/groups/")) {
    return normalized.replace(/^\/groups/, "Groups");
  }
  if (normalized === userRoot) {
    return "My Drive";
  }
  if (normalized.startsWith(`${userRoot}/`)) {
    return `My Drive${normalized.slice(userRoot.length)}`;
  }
  return "My Drive";
}

function apiPathFromUiPath(path: string, username: string, groupRoots: Set<string>): string {
  const normalized = path.trim().replace(/\/+$/, "");
  const userRoot = `/users/${username}`;
  if (normalized === "My Drive") {
    return userRoot;
  }
  if (normalized === "Groups") {
    return "/groups";
  }
  if (normalized.startsWith("Groups/")) {
    const relative = normalized.slice("Groups/".length);
    return `/groups/${relative}`;
  }
  if (normalized.startsWith("My Drive/")) {
    const relative = normalized.slice("My Drive/".length);
    const [head] = relative.split("/");
    if (head && groupRoots.has(head)) {
      return `/groups/${relative}`;
    }
    return `${userRoot}/${relative}`;
  }
  if (normalized === "Trash" || normalized.startsWith("Trash/")) {
    return userRoot;
  }
  return userRoot;
}

function inferFileKindFromName(name: string): FileKind {
  const lower = name.toLowerCase();
  if (/\.(png|jpe?g|gif|webp|bmp|svg|avif|heic)$/i.test(lower)) return "image";
  if (/\.(mp4|mov|m4v|mkv|webm|avi)$/i.test(lower)) return "video";
  if (/\.(mp3|wav|ogg|flac|m4a|aac)$/i.test(lower)) return "audio";
  if (/\.(zip|tar|gz|bz2|xz|rar|7z)$/i.test(lower)) return "archive";
  if (/\.(pdf|docx?|xlsx?|pptx?|txt|rtf|md)$/i.test(lower)) return "doc";
  return "file";
}

function extensionFromFileName(name: string): string {
  const trimmed = name.trim();
  if (!trimmed.includes(".")) return "";
  return (trimmed.split(".").pop() ?? "").toLowerCase();
}

function formatBytesCompact(bytes: number): string {
  if (bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  const precision = value >= 100 || unit === 0 ? 0 : 1;
  return `${value.toFixed(precision)} ${units[unit]}`;
}

function driveFileFromEntry(
  entry: DriveUIData["directory"]["files"][number],
  username: string,
): DriveFile {
  const apiPath = pathFromDirectoryEntry(entry);
  const parentApiPath = parentAndName(apiPath).destination;
  const parent = uiPathFromApiPath(parentApiPath, username);
  const kind: FileKind = entry.type === "dir" ? "folder" : inferFileKindFromName(entry.name);
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
  const launchOfficeEditor = useCallback((params: URLSearchParams) => {
    const target = `/office/editor?${params.toString()}`;
    void wgwEnsureOfficeSession()
      .catch(() => {
        // Best effort: navigation still proceeds and server auth gate handles fallback.
      })
      .finally(() => {
        window.location.assign(target);
      });
  }, []);

  const currentUsername = data.user.username || session.user.username;
  const [files, setFiles] = useState<DriveFile[]>(
    operations
      ? data.directory.files.map((entry) => driveFileFromEntry(entry, currentUsername))
      : INITIAL_FILES,
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
  const [newFolderDialogOpen, setNewFolderDialogOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [renameDialog, setRenameDialog] = useState<null | { id: string }>(null);
  const [renameName, setRenameName] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<null | { ids: string[]; permanent: boolean }>(
    null,
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [liveSearchResults, setLiveSearchResults] = useState<DriveFile[] | null>(null);
  const [starredItems, setStarredItems] = useState<DriveFile[] | null>(null);
  const [knownGroupRoots, setKnownGroupRoots] = useState<string[]>([]);
  const [imagePreviewUrls, setImagePreviewUrls] = useState<Record<string, string>>({});
  const [dropUploadActive, setDropUploadActive] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{
    label: string;
    percent: number;
    detail: string;
    done: boolean;
  } | null>(null);
  const imagePreviewUrlsRef = useRef<Record<string, string>>({});
  const uploadProgressResetTimerRef = useRef<number | null>(null);
  const starredLoadVersionRef = useRef(0);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const discovered = new Set<string>();
    for (const file of files) {
      if (!file.apiPath || !file.apiPath.startsWith("/groups/")) continue;
      const relative = file.apiPath.slice("/groups/".length);
      const [root] = relative.split("/");
      if (root) discovered.add(root);
    }
    if (discovered.size === 0) return;
    setKnownGroupRoots((prev) => {
      const next = new Set(prev);
      discovered.forEach((root) => next.add(root));
      return Array.from(next).sort((a, b) => a.localeCompare(b));
    });
  }, [files]);

  const groupRootNames = useMemo(() => new Set(knownGroupRoots), [knownGroupRoots]);
  const sidebarGroupPaths = useMemo(
    () => knownGroupRoots.map((root) => `Groups/${root}`),
    [knownGroupRoots],
  );

  useEffect(() => {
    if (!operations) return;
    setFiles(data.directory.files.map((entry) => driveFileFromEntry(entry, currentUsername)));
    setView({ type: "folder", path: uiPathFromApiPath(data.cwd, currentUsername) });
  }, [data, operations, currentUsername]);

  const loadStarredItemsFromPaths = useCallback(
    (paths: string[]) => {
      if (!operations) {
        setStarredItems(null);
        return;
      }
      const requestVersion = starredLoadVersionRef.current + 1;
      starredLoadVersionRef.current = requestVersion;
      if (paths.length === 0) {
        setStarredItems([]);
        return;
      }
      void operations
        .listEntriesByPaths(paths)
        .then((entries) => {
          if (requestVersion !== starredLoadVersionRef.current) return;
          setStarredItems(entries.map((entry) => driveFileFromEntry(entry, currentUsername)));
        })
        .catch((error: unknown) => {
          if (requestVersion !== starredLoadVersionRef.current) return;
          const message = error instanceof Error ? error.message : String(error);
          toast.error(message);
        });
    },
    [operations, currentUsername],
  );

  const reloadStarredFromServer = useCallback(() => {
    if (!operations) return;
    void operations
      .listStars()
      .then((paths) => {
        const next: Record<string, boolean> = {};
        for (const path of paths) {
          next[path] = true;
        }
        setStarred(next);
        loadStarredItemsFromPaths(paths);
      })
      .catch((error: unknown) => {
        const message = error instanceof Error ? error.message : String(error);
        toast.error(message);
      });
  }, [operations, loadStarredItemsFromPaths]);

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
            setLiveSearchResults(
              entries.map((entry) => driveFileFromEntry(entry, currentUsername)),
            );
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
  }, [operations, searchQuery, currentUsername]);

  const isTouch = useIsTouch();
  const lastTouchTapRef = useRef<{ id: string; at: number } | null>(null);

  useEffect(() => {
    if (!operations) {
      setStarredItems(null);
      return;
    }
    reloadStarredFromServer();
  }, [operations, currentUsername, reloadStarredFromServer]);

  const inTrashView = view.type === "folder" && view.path === "Trash";

  const isUnderTrash = (parent: string) => parent === "Trash" || parent.startsWith("Trash/");

  const visibleItems = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const sourceFiles = liveSearchResults ?? files;
    const starredSourceFiles = operations ? (starredItems ?? []) : sourceFiles;
    const filtered = sourceFiles.filter((f) => {
      let inView = false;
      if (liveSearchResults) inView = true;
      else if (view.type === "folder")
        inView =
          f.parent === view.path &&
          !(
            view.path === "My Drive" &&
            f.kind === "folder" &&
            typeof f.apiPath === "string" &&
            f.apiPath.startsWith("/groups/")
          );
      else if (view.type === "recent") inView = !isUnderTrash(f.parent) && f.kind !== "folder";
      else if (view.type === "starred") {
        if (operations) return false;
        inView = !!starred[f.id] && !isUnderTrash(f.parent);
      } else if (view.type === "shared")
        inView = f.parent === "Shared with me" || f.parent.startsWith("Shared with me/");
      if (!inView) return false;
      if (!q) return true;
      const hay = `${f.title} ${f.excerpt} ${f.owner}`.toLowerCase();
      return hay.includes(q);
    });
    const starredFiltered =
      view.type === "starred" && operations
        ? starredSourceFiles.filter((f) => {
            if (!starred[f.id] || isUnderTrash(f.parent)) return false;
            if (!q) return true;
            const hay = `${f.title} ${f.excerpt} ${f.owner}`.toLowerCase();
            return hay.includes(q);
          })
        : null;
    const items = starredFiltered ?? filtered;
    // folders first
    return items.sort((a, b) => {
      if (a.kind === "folder" && b.kind !== "folder") return -1;
      if (b.kind === "folder" && a.kind !== "folder") return 1;
      return 0;
    });
  }, [files, liveSearchResults, operations, searchQuery, starred, starredItems, view]);

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
    setRenameDialog(null);
    lastTouchTapRef.current = null;
  }, [viewResetKey]);

  useEffect(() => {
    if (!operations || viewMode !== "grid") return;
    const previewableItems = visibleItems.filter(
      (file) => (file.kind === "image" || file.kind === "video") && !!file.apiPath,
    );
    let cancelled = false;
    for (const file of previewableItems) {
      if (imagePreviewUrlsRef.current[file.id]) continue;
      void operations
        .readFileBlob(file.apiPath!)
        .then((blob) => {
          if (cancelled) return;
          const url = URL.createObjectURL(blob);
          setImagePreviewUrls((prev) => {
            if (prev[file.id]) {
              URL.revokeObjectURL(url);
              return prev;
            }
            const next = { ...prev, [file.id]: url };
            imagePreviewUrlsRef.current = next;
            return next;
          });
        })
        .catch(() => {
          // Ignore preview fetch failures; tile falls back to icon.
        });
    }
    return () => {
      cancelled = true;
    };
  }, [operations, viewMode, visibleItems]);

  useEffect(() => {
    const keepIds = new Set(
      viewMode === "grid"
        ? visibleItems
            .filter((file) => (file.kind === "image" || file.kind === "video") && !!file.apiPath)
            .map((file) => file.id)
        : [],
    );
    setImagePreviewUrls((prev) => {
      let changed = false;
      const next: Record<string, string> = {};
      for (const [id, url] of Object.entries(prev)) {
        if (keepIds.has(id)) next[id] = url;
        else {
          URL.revokeObjectURL(url);
          changed = true;
        }
      }
      if (!changed && Object.keys(next).length === Object.keys(prev).length) return prev;
      imagePreviewUrlsRef.current = next;
      return next;
    });
  }, [viewMode, visibleItems]);

  useEffect(() => {
    return () => {
      for (const url of Object.values(imagePreviewUrlsRef.current)) {
        URL.revokeObjectURL(url);
      }
      imagePreviewUrlsRef.current = {};
      if (uploadProgressResetTimerRef.current !== null) {
        window.clearTimeout(uploadProgressResetTimerRef.current);
      }
    };
  }, []);

  const active = activeId
    ? ((liveSearchResults?.find((f) => f.id === activeId) ??
        files.find((f) => f.id === activeId) ??
        null) as DriveFile | null)
    : null;

  useEffect(() => {
    if (
      !operations ||
      !detailOpen ||
      !active ||
      (active.kind !== "image" && active.kind !== "video") ||
      !active.apiPath
    )
      return;
    if (imagePreviewUrlsRef.current[active.id]) return;
    let cancelled = false;
    void operations
      .readFileBlob(active.apiPath)
      .then((blob) => {
        if (cancelled) return;
        const url = URL.createObjectURL(blob);
        setImagePreviewUrls((prev) => {
          if (prev[active.id]) {
            URL.revokeObjectURL(url);
            return prev;
          }
          const next = { ...prev, [active.id]: url };
          imagePreviewUrlsRef.current = next;
          return next;
        });
      })
      .catch(() => {
        // Keep icon fallback in detail panel.
      });
    return () => {
      cancelled = true;
    };
  }, [operations, detailOpen, active]);

  const openFile = (f: DriveFile) => {
    if (f.kind === "folder") {
      const next = f.parent === "" ? f.title : `${f.parent}/${f.title}`;
      setView({ type: "folder", path: next });
      if (operations) {
        void operations
          .changeDir(f.apiPath ?? apiPathFromUiPath(next, currentUsername, groupRootNames))
          .then((nextData) => {
            setFiles(
              nextData.directory.files.map((entry) => driveFileFromEntry(entry, currentUsername)),
            );
            setView({ type: "folder", path: uiPathFromApiPath(nextData.cwd, currentUsername) });
          })
          .catch((error: unknown) => {
            const message = error instanceof Error ? error.message : String(error);
            toast.error(message);
          });
      }
    } else {
      const officeExt = extensionFromFileName(f.title);
      if (f.apiPath && OFFICE_EDITOR_EXTENSIONS.has(officeExt)) {
        const rel = f.apiPath.replace(/^\/+/, "");
        const qp = new URLSearchParams({ file: rel });
        launchOfficeEditor(qp);
        return;
      }
      setActiveId(f.id);
      setSelectedIds([f.id]);
      setDetailOpen(true);
    }
  };

  const handleSelect = (id: string, e: React.MouseEvent) => {
    if (isTouch && !selectionMode && !e.shiftKey && !e.metaKey && !e.ctrlKey) {
      const now = Date.now();
      const lastTap = lastTouchTapRef.current;
      if (lastTap && lastTap.id === id && now - lastTap.at < 350) {
        const tappedItem = visibleItems.find((file) => file.id === id);
        if (tappedItem) {
          lastTouchTapRef.current = null;
          openFile(tappedItem);
          return;
        }
      }
      lastTouchTapRef.current = { id, at: now };
    } else if (!isTouch) {
      lastTouchTapRef.current = null;
    }

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

  const fileById = (id: string) =>
    (liveSearchResults?.find((file) => file.id === id) ?? files.find((file) => file.id === id)) ||
    null;

  const toggleStar = (id: string) => {
    const target = fileById(id);
    let nextValue = false;
    setStarred((s) => {
      nextValue = !s[id];
      toast(nextValue ? "Starred" : "Unstarred", {
        icon: nextValue ? (
          <Star className="size-4" fill="currentColor" />
        ) : (
          <StarOff className="size-4" />
        ),
      });
      return { ...s, [id]: nextValue };
    });
    if (!operations || !target?.apiPath) return;
    void operations
      .setStar({ path: target.apiPath, starred: nextValue })
      .then(() => {
        if (view.type === "starred") reloadStarredFromServer();
      })
      .catch((error: unknown) => {
        setStarred((s) => ({ ...s, [id]: !nextValue }));
        reloadStarredFromServer();
        const message = error instanceof Error ? error.message : String(error);
        toast.error(message);
      });
  };
  const batchStar = () => {
    const nextValue = !selectedIds.every((id) => starred[id]);
    setStarred((s) => {
      const next = { ...s };
      selectedIds.forEach((id) => (next[id] = nextValue));
      toast(`${nextValue ? "Starred" : "Unstarred"} ${selectedIds.length}`, {
        icon: nextValue ? (
          <Star className="size-4" fill="currentColor" />
        ) : (
          <StarOff className="size-4" />
        ),
      });
      return next;
    });
    if (!operations) return;
    const targets = selectedIds
      .map((id) => fileById(id))
      .filter((file): file is DriveFile => !!file?.apiPath);
    if (targets.length === 0) return;
    void (async () => {
      let failed = false;
      for (const file of targets) {
        try {
          await operations.setStar({ path: file.apiPath!, starred: nextValue });
        } catch {
          failed = true;
        }
      }
      if (failed) {
        reloadStarredFromServer();
        toast.error("Could not sync one or more star changes.");
      } else if (view.type === "starred") {
        reloadStarredFromServer();
      }
    })();
  };
  const moveToTrash = (ids: string[]) => {
    setFiles((p) => p.map((f) => (ids.includes(f.id) ? { ...f, parent: "Trash" } : f)));
    toast(`Moved ${ids.length} to Trash`, { icon: <Trash2 className="size-4" /> });
  };
  const moveToFolder = (ids: string[], parent: string) => {
    setFiles((p) => p.map((f) => (ids.includes(f.id) ? { ...f, parent } : f)));
    toast(`Moved ${ids.length} to ${parent.split("/").pop()}`, {
      icon: <FolderInput className="size-4" />,
    });
    if (operations) {
      const destination = apiPathFromUiPath(parent, currentUsername, groupRootNames);
      const items = files.filter((file) => ids.includes(file.id));
      if (items.length > 0) {
        void (async () => {
          try {
            let nextData: DriveUIData | null = null;
            for (const file of items) {
              const sourcePath =
                file.apiPath ??
                normalizeApiVirtualPath(
                  `${apiPathFromUiPath(file.parent, currentUsername, groupRootNames)}/${file.title}`,
                );
              nextData = await operations.renameItem({
                destination,
                from: sourcePath,
                to: file.title,
              });
            }
            if (nextData) {
              setFiles(
                nextData.directory.files.map((entry) => driveFileFromEntry(entry, currentUsername)),
              );
              setView({ type: "folder", path: uiPathFromApiPath(nextData.cwd, currentUsername) });
            }
          } catch (error: unknown) {
            const message = error instanceof Error ? error.message : String(error);
            toast.error(message);
          }
        })();
      }
    }
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
    setConfirmDelete({ ids: selectedIds, permanent: inTrashView });
  };
  const requestDeleteItem = (file: DriveFile) => {
    setConfirmDelete({ ids: [file.id], permanent: isUnderTrash(file.parent) });
  };
  const requestRenameItem = (file: DriveFile) => {
    setRenameDialog({ id: file.id });
    setRenameName(file.title);
  };
  const submitRenameItem = () => {
    if (!renameDialog) return;
    const file = fileById(renameDialog.id);
    if (!file) {
      setRenameDialog(null);
      return;
    }
    const nextName = renameName.trim();
    if (!nextName || nextName === file.title) {
      setRenameDialog(null);
      return;
    }
    const previousName = file.title;
    setFiles((prev) =>
      prev.map((item) => (item.id === file.id ? { ...item, title: nextName } : item)),
    );
    setRenameDialog(null);
    setRenameName("");
    toast(`Renamed to “${nextName}”`, { icon: <Pencil className="size-4" /> });
    if (!operations) return;
    const destination = apiPathFromUiPath(file.parent, currentUsername, groupRootNames);
    const fromPath = file.apiPath ?? normalizeApiVirtualPath(`${destination}/${previousName}`);
    void operations
      .renameItem({
        destination,
        from: fromPath,
        to: nextName,
      })
      .then((nextData) => {
        setFiles(
          nextData.directory.files.map((entry) => driveFileFromEntry(entry, currentUsername)),
        );
        setView({ type: "folder", path: uiPathFromApiPath(nextData.cwd, currentUsername) });
      })
      .catch((error: unknown) => {
        setFiles((prev) =>
          prev.map((item) => (item.id === file.id ? { ...item, title: previousName } : item)),
        );
        const message = error instanceof Error ? error.message : String(error);
        toast.error(message);
      });
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
            setFiles(
              nextData.directory.files.map((entry) => driveFileFromEntry(entry, currentUsername)),
            );
            setView({ type: "folder", path: uiPathFromApiPath(nextData.cwd, currentUsername) });
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
    const selected = Array.from(fileList);
    const targetParent = view.type === "folder" ? view.path : "My Drive";
    const showProgress = (progress: DriveUploadProgress) => {
      const totalBytes = Math.max(1, progress.totalBytes);
      const percent = Math.min(100, Math.round((progress.uploadedBytes / totalBytes) * 100));
      const fileLabel =
        progress.currentFileName.trim() !== ""
          ? `Uploading ${progress.currentFileName}`
          : "Uploading files";
      const detail = `${formatBytesCompact(progress.uploadedBytes)} / ${formatBytesCompact(progress.totalBytes)} · ${progress.filesCompleted}/${progress.filesTotal} files`;
      setUploadProgress({ label: fileLabel, percent, detail, done: false });
    };
    if (uploadProgressResetTimerRef.current !== null) {
      window.clearTimeout(uploadProgressResetTimerRef.current);
      uploadProgressResetTimerRef.current = null;
    }
    setUploadProgress({
      label:
        selected.length === 1
          ? `Uploading ${selected[0]!.name}`
          : `Uploading ${selected.length} files`,
      percent: 0,
      detail: `0 / ${formatBytesCompact(selected.reduce((sum, file) => sum + file.size, 0))}`,
      done: false,
    });
    if (operations) {
      void operations
        .checkUploadReady()
        .then(() =>
          operations.uploadFiles(
            {
              cwd: apiPathFromUiPath(targetParent, currentUsername, groupRootNames),
              files: selected,
            },
            { onProgress: showProgress },
          ),
        )
        .then((nextData) => {
          setFiles(
            nextData.directory.files.map((entry) => driveFileFromEntry(entry, currentUsername)),
          );
          setView({ type: "folder", path: uiPathFromApiPath(nextData.cwd, currentUsername) });
          setUploadProgress({
            label: `Uploaded ${selected.length} file${selected.length === 1 ? "" : "s"}`,
            percent: 100,
            detail: "Upload complete",
            done: true,
          });
          uploadProgressResetTimerRef.current = window.setTimeout(() => {
            setUploadProgress(null);
            uploadProgressResetTimerRef.current = null;
          }, 1400);
          toast(`Uploaded ${selected.length} file${selected.length === 1 ? "" : "s"}`, {
            icon: <Upload className="size-4" />,
          });
        })
        .catch((error: unknown) => {
          setUploadProgress(null);
          const message = error instanceof Error ? error.message : String(error);
          toast.error(message);
        });
      return;
    }
    const created: DriveFile[] = selected.map((file, i) => {
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
    setUploadProgress({
      label: `Uploaded ${created.length} file${created.length === 1 ? "" : "s"}`,
      percent: 100,
      detail: "Upload complete",
      done: true,
    });
    uploadProgressResetTimerRef.current = window.setTimeout(() => {
      setUploadProgress(null);
      uploadProgressResetTimerRef.current = null;
    }, 1200);
    toast(`Uploaded ${created.length} file${created.length === 1 ? "" : "s"}`, {
      icon: <Upload className="size-4" />,
    });
  };

  const createFolder = () => {
    setNewFolderName("");
    setNewFolderDialogOpen(true);
  };

  const submitCreateFolder = () => {
    const v = newFolderName.trim();
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
    setNewFolderDialogOpen(false);
    setNewFolderName("");
    if (operations) {
      void operations
        .createFolder({
          cwd: apiPathFromUiPath(targetParent, currentUsername, groupRootNames),
          name: v,
        })
        .then((nextData) => {
          setFiles(
            nextData.directory.files.map((entry) => driveFileFromEntry(entry, currentUsername)),
          );
          setView({ type: "folder", path: uiPathFromApiPath(nextData.cwd, currentUsername) });
        })
        .catch((error: unknown) => {
          const message = error instanceof Error ? error.message : String(error);
          toast.error(message);
        });
    }
  };

  const copyShareLink = async (file: DriveFile) => {
    const link =
      file.apiPath != null
        ? `${window.location.origin}/drive/#${encodeURIComponent(file.apiPath)}`
        : `${window.location.origin}/drive/`;
    try {
      await navigator.clipboard.writeText(link);
      toast("Share link copied", { icon: <Share2 className="size-4" /> });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      toast.error(message || "Could not copy share link");
    }
  };

  const createBlank = (kind: "doc" | "sheet" | "slides") => {
    const editorKind = kind === "doc" ? "docx" : kind === "sheet" ? "xlsx" : "pptx";
    const qp = new URLSearchParams({ new: editorKind });
    launchOfficeEditor(qp);
  };

  const selectView = (v: ViewKey) => {
    setView(v);
    setLiveSearchResults(null);
    if (operations && v.type === "folder" && v.path !== "Trash") {
      void operations
        .changeDir(apiPathFromUiPath(v.path, currentUsername, groupRootNames))
        .then((nextData) => {
          setFiles(
            nextData.directory.files.map((entry) => driveFileFromEntry(entry, currentUsername)),
          );
          setView({ type: "folder", path: uiPathFromApiPath(nextData.cwd, currentUsername) });
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
        setConfirmDelete({ ids: selectedIds, permanent: inTrashView });
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [selectedIds, detailOpen, inTrashView]);

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
          ["--sidebar-logo-close-button-color" as string]: "var(--app-sidebar-color)",
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
                  active={
                    view.type === "folder" &&
                    (view.path === "My Drive" || view.path.startsWith("My Drive/"))
                  }
                  onClick={() => selectView({ type: "folder", path: "My Drive" })}
                  icon={topFolderIcon["My Drive"]}
                  isDropTarget={dropTarget === "My Drive"}
                  onDragOver={(e) => {
                    if (dragging) {
                      e.preventDefault();
                      setDropTarget("My Drive");
                    }
                  }}
                  onDragLeave={() =>
                    setDropTarget((target) => (target === "My Drive" ? null : target))
                  }
                  onDrop={(e) => {
                    e.preventDefault();
                    dropOnFolder("My Drive");
                  }}
                >
                  My Drive
                </SidebarLink>
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
                >
                  Starred
                </SidebarLink>
                <SidebarLink
                  active={
                    view.type === "folder" &&
                    (view.path === "Trash" || view.path.startsWith("Trash/"))
                  }
                  onClick={() => selectView({ type: "folder", path: "Trash" })}
                  icon={topFolderIcon.Trash}
                  isDropTarget={dropTarget === "Trash"}
                  onDragOver={(e) => {
                    if (dragging) {
                      e.preventDefault();
                      setDropTarget("Trash");
                    }
                  }}
                  onDragLeave={() =>
                    setDropTarget((target) => (target === "Trash" ? null : target))
                  }
                  onDrop={(e) => {
                    e.preventDefault();
                    dropOnFolder("Trash");
                  }}
                >
                  Trash
                </SidebarLink>
              </ul>

              {sidebarGroupPaths.length > 0 && (
                <SidebarGroup label="Groups">
                  {sidebarGroupPaths.map((groupPath) => (
                    <SidebarLink
                      key={groupPath}
                      active={
                        view.type === "folder" &&
                        (view.path === groupPath || view.path.startsWith(`${groupPath}/`))
                      }
                      onClick={() => selectView({ type: "folder", path: groupPath })}
                      icon={<Users className="size-3.5" />}
                      isDropTarget={dropTarget === groupPath}
                      onDragOver={(e) => {
                        if (dragging) {
                          e.preventDefault();
                          setDropTarget(groupPath);
                        }
                      }}
                      onDragLeave={() =>
                        setDropTarget((target) => (target === groupPath ? null : target))
                      }
                      onDrop={(e) => {
                        e.preventDefault();
                        dropOnFolder(groupPath);
                      }}
                    >
                      {groupPath.split("/").pop()}
                    </SidebarLink>
                  ))}
                </SidebarGroup>
              )}
            </nav>

            <WorkspaceUserFooter
              name={session.user.displayName}
              initials={workspaceUserInitials(session.user)}
              detailLine={session.user.username}
              onLogoutClick={() => window.location.assign("/logout")}
              linkHoverClassName="hover:bg-[color-mix(in_oklab,var(--color-ink)_18%,transparent)]"
            />
          </div>
        </AppSidebar>
        <AppSidebarScrim open={sidebarOpen} onClick={() => setSidebarOpen(false)} />

        {/* Main browser */}
        <section
          className="flex-1 flex flex-col min-w-0 relative"
          style={{ backgroundColor: "var(--color-cream, #f5f1e8)" }}
          onDragOver={(event) => {
            if (!event.dataTransfer.types.includes("Files")) return;
            event.preventDefault();
            setDropUploadActive(true);
          }}
          onDragLeave={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
              setDropUploadActive(false);
            }
          }}
          onDrop={(event) => {
            if (!event.dataTransfer.types.includes("Files")) return;
            event.preventDefault();
            setDropUploadActive(false);
            handleUpload(event.dataTransfer.files);
          }}
        >
          {dropUploadActive && (
            <div className="pointer-events-none absolute inset-0 z-40 flex items-center justify-center bg-black/10">
              <div className="rounded-xl bg-white/90 px-4 py-2 text-sm font-medium text-[#0c8397] shadow">
                Drop files to upload to{" "}
                {view.type === "folder" ? view.path.split("/").pop() || "My Drive" : "My Drive"}
              </div>
            </div>
          )}
          <header
            className="px-4 md:px-8 pt-4 md:pt-6 pb-3 border-b shrink-0"
            style={{ borderColor: "color-mix(in oklab, var(--color-ink) 10%, transparent)" }}
          >
            <ListHeader
              sidebarOpen={sidebarOpen}
              onToggleSidebar={() => setSidebarOpen((v) => !v)}
              title={viewLabel}
              subtitle={
                selectionMode || selectedIds.length > 1
                  ? `${selectedIds.length} Selected`
                  : `${visibleItems.length} Items`
              }
              actions={
                <>
                  <div
                    className="hidden sm:flex items-center rounded-full p-0.5"
                    style={{
                      backgroundColor: "color-mix(in oklab, var(--color-ink) 6%, transparent)",
                    }}
                  >
                    <button
                      aria-label="Grid view"
                      title="Grid view"
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
                      title="List view"
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
                  <IconButton
                    label={detailOpen ? "Hide details" : "Show details"}
                    onClick={() => setDetailOpen((v) => !v)}
                    icon={<Info />}
                    size="sm"
                    variant="subtle"
                    style={LIST_ICON_BUTTON_STYLE}
                  />
                  {inTrashView && visibleItems.length > 0 && (
                    <IconButton
                      label="Empty trash"
                      onClick={() => setConfirmDelete({ ids: visibleItems.map((f) => f.id) })}
                      icon={<Trash2 />}
                      size="sm"
                      variant="subtle"
                      style={LIST_ICON_BUTTON_STYLE}
                    />
                  )}
                </>
              }
              searchPlaceholder="Search in Drive..."
              searchValue={searchQuery}
              onSearchInput={setSearchQuery}
              searchInputRef={searchInputRef}
            />
          </header>
          {uploadProgress && (
            <div
              className="px-4 md:px-8 py-2.5 border-b shrink-0"
              style={{ borderColor: "color-mix(in oklab, var(--color-ink) 8%, transparent)" }}
            >
              <div className="flex items-center justify-between gap-3 text-xs">
                <span
                  className="font-medium truncate"
                  style={{ color: "color-mix(in oklab, var(--color-ink) 85%, transparent)" }}
                >
                  {uploadProgress.label}
                </span>
                <span
                  className="tabular-nums shrink-0"
                  style={{ color: "color-mix(in oklab, var(--color-ink) 60%, transparent)" }}
                >
                  {uploadProgress.percent}%
                </span>
              </div>
              <div
                className="mt-1.5 h-1.5 w-full rounded-full overflow-hidden"
                style={{
                  backgroundColor: "color-mix(in oklab, var(--color-ink) 10%, transparent)",
                }}
              >
                <div
                  className="h-full rounded-full transition-[width] duration-150"
                  style={{
                    width: `${uploadProgress.percent}%`,
                    backgroundColor: uploadProgress.done
                      ? "var(--color-emerald)"
                      : "var(--drive-sidebar)",
                  }}
                />
              </div>
              <p
                className="mt-1 text-[11px]"
                style={{ color: "color-mix(in oklab, var(--color-ink) 58%, transparent)" }}
              >
                {uploadProgress.detail}
              </p>
            </div>
          )}

          {/* Content */}
          <div className="flex-1 flex min-h-0">
            <div className="flex-1 overflow-y-auto min-w-0">
              <div className="px-4 md:px-8 pt-4 md:pt-6 pb-2">
                <nav
                  className="min-w-0 flex items-center gap-1 overflow-x-auto"
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
                            className="text-sm md:text-base leading-none truncate"
                            style={{
                              color: "color-mix(in oklab, var(--color-ink) 72%, transparent)",
                            }}
                          >
                            {b.label}
                          </span>
                        ) : (
                          <button
                            onClick={() => selectView({ type: "folder", path: b.path! })}
                            className="text-sm md:text-base leading-none truncate hover:underline underline-offset-4"
                            style={{
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
              </div>
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
                  imagePreviewUrls={imagePreviewUrls}
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
                  onTrash={requestDeleteItem}
                  onRename={requestRenameItem}
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
                  onTrash={requestDeleteItem}
                  onRename={requestRenameItem}
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
                  previewSrc={imagePreviewUrls[active.id]}
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
                  onShare={() => copyShareLink(active)}
                  onDelete={() =>
                    isUnderTrash(active.parent)
                      ? setConfirmDelete({ ids: [active.id], permanent: true })
                      : setConfirmDelete({ ids: [active.id], permanent: false })
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
                previewSrc={imagePreviewUrls[active.id]}
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
                onShare={() => copyShareLink(active)}
                onDelete={() =>
                  isUnderTrash(active.parent)
                    ? setConfirmDelete({ ids: [active.id], permanent: true })
                    : setConfirmDelete({ ids: [active.id], permanent: false })
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
              <IconButton
                label="Star"
                onClick={batchStar}
                icon={<Star />}
                variant="ghost"
                className={FAB_ICON_BUTTON_CLASSNAME}
                style={FAB_ICON_BUTTON_STYLE}
              />
              <IconButton
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
                icon={<Download />}
                variant="ghost"
                className={FAB_ICON_BUTTON_CLASSNAME}
                style={FAB_ICON_BUTTON_STYLE}
              />
              <IconButton
                label={inTrashView ? "Delete permanently" : "Move to trash"}
                onClick={requestDeleteSelected}
                icon={<Trash2 />}
                variant="ghost"
                className={FAB_ICON_BUTTON_CLASSNAME}
                style={FAB_ICON_BUTTON_STYLE}
              />
              <IconButton
                label="Done"
                onClick={exitSelection}
                icon={<X />}
                variant="ghost"
                className={FAB_ICON_BUTTON_CLASSNAME}
                style={FAB_ICON_BUTTON_STYLE}
              />
            </div>
          )}
        </section>

        <Dialog open={newFolderDialogOpen} onOpenChange={setNewFolderDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create new folder</DialogTitle>
              <DialogDescription>Enter a name for the new folder.</DialogDescription>
            </DialogHeader>
            <Input
              autoFocus
              placeholder="Folder name"
              value={newFolderName}
              onChange={(event) => setNewFolderName(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  submitCreateFolder();
                }
              }}
            />
            <DialogFooter>
              <Button variant="outline" onClick={() => setNewFolderDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={submitCreateFolder} disabled={!newFolderName.trim()}>
                Create folder
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog
          open={!!renameDialog}
          onOpenChange={(open) => {
            if (!open) {
              setRenameDialog(null);
              setRenameName("");
            }
          }}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Rename item</DialogTitle>
              <DialogDescription>Enter a new name for this file or folder.</DialogDescription>
            </DialogHeader>
            <Input
              autoFocus
              placeholder="Name"
              value={renameName}
              onChange={(event) => setRenameName(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  submitRenameItem();
                }
              }}
            />
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setRenameDialog(null);
                  setRenameName("");
                }}
              >
                Cancel
              </Button>
              <Button onClick={submitRenameItem} disabled={!renameName.trim()}>
                Rename
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <AlertDialog open={!!confirmDelete} onOpenChange={(o) => !o && setConfirmDelete(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                {confirmDelete?.permanent ? "Delete permanently?" : "Move to Trash?"}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {confirmDelete?.permanent
                  ? `This will permanently delete ${confirmDelete?.ids.length} file${
                      confirmDelete && confirmDelete.ids.length === 1 ? "" : "s"
                    }. This cannot be undone.`
                  : `This will move ${confirmDelete?.ids.length} file${
                      confirmDelete && confirmDelete.ids.length === 1 ? "" : "s"
                    } to Trash.`}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  if (confirmDelete) {
                    if (confirmDelete.permanent) reallyDelete(confirmDelete.ids);
                    else moveToTrash(confirmDelete.ids);
                  }
                  setConfirmDelete(null);
                }}
              >
                {confirmDelete?.permanent ? "Delete" : "Move to Trash"}
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
  imagePreviewUrls,
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
  onTrash,
  onRename,
  onDragStart,
  onDragEnd,
  onDropOnFolder,
  setDropTarget,
}: {
  items: DriveFile[];
  imagePreviewUrls: Record<string, string>;
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
  onTrash: (file: DriveFile) => void;
  onRename: (file: DriveFile) => void;
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
                onTrash={() => onTrash(f)}
                onRename={() => onRename(f)}
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
                previewSrc={imagePreviewUrls[f.id]}
                isSelected={selectedIds.includes(f.id)}
                isStarred={!!starred[f.id]}
                isDragging={dragging?.includes(f.id) ?? false}
                isTouch={isTouch}
                onSelect={(e) => onSelect(f.id, e)}
                onOpen={() => onOpen(f)}
                onLongPress={() => onLongPress(f.id)}
                onStar={() => onStar(f.id)}
                onTrash={() => onTrash(f)}
                onRename={() => onRename(f)}
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
  onTrash,
  onRename,
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
  onTrash: () => void;
  onRename: () => void;
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
            ? "inset 0 0 0 3px var(--color-emerald), 0 0 0 1px color-mix(in oklab, var(--color-emerald) 35%, transparent)"
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
      <ItemActionsMenu
        isStarred={isStarred}
        onStar={onStar}
        onTrash={onTrash}
        onRename={onRename}
      />
    </button>
  );
}

function FileTile({
  file,
  previewSrc,
  isSelected,
  isStarred,
  isDragging,
  isTouch,
  onSelect,
  onOpen,
  onLongPress,
  onStar,
  onTrash,
  onRename,
  onDragStart,
  onDragEnd,
}: {
  file: DriveFile;
  previewSrc?: string;
  isSelected: boolean;
  isStarred: boolean;
  isDragging: boolean;
  isTouch: boolean;
  onSelect: (e: React.MouseEvent) => void;
  onOpen: () => void;
  onLongPress: () => void;
  onStar: () => void;
  onTrash: () => void;
  onRename: () => void;
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
          ? "inset 0 0 0 3px var(--color-emerald), 0 0 0 1px color-mix(in oklab, var(--color-emerald) 35%, transparent)"
          : "inset 0 0 0 1px color-mix(in oklab, var(--color-ink) 8%, transparent)",
        outline: isSelected ? "2px solid var(--color-emerald)" : "none",
        outlineOffset: "-2px",
      }}
    >
      {isStarred && (
        <span
          className="absolute top-2 right-2 z-10 rounded-full p-1.5 pointer-events-none"
          style={{
            backgroundColor: "color-mix(in oklab, var(--color-cream, #f5f1e8) 90%, transparent)",
            color: "var(--color-emerald)",
            boxShadow: "0 2px 8px color-mix(in oklab, var(--color-ink) 20%, transparent)",
          }}
          aria-hidden="true"
        >
          <Star className="size-3.5" fill="currentColor" />
        </span>
      )}
      <div
        className="aspect-[4/3] flex items-center justify-center"
        style={{
          backgroundColor: "color-mix(in oklab, var(--drive-sidebar) 8%, transparent)",
          color: "var(--drive-sidebar)",
        }}
      >
        {(file.kind === "image" || file.kind === "video") && previewSrc ? (
          file.kind === "video" ? (
            <video
              src={previewSrc}
              className="h-full w-full object-cover"
              muted
              playsInline
              preload="metadata"
            />
          ) : (
            <img src={previewSrc} alt={file.title} className="h-full w-full object-cover" />
          )
        ) : (
          <span className="[&>svg]:size-12 opacity-80">{kindIconLg[file.kind]}</span>
        )}
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
        <ItemActionsMenu
          isStarred={isStarred}
          onStar={onStar}
          onTrash={onTrash}
          onRename={onRename}
        />
      </div>
    </div>
  );
}

function ItemActionsMenu({
  isStarred,
  onStar,
  onTrash,
  onRename,
}: {
  isStarred: boolean;
  onStar: () => void;
  onTrash: () => void;
  onRename: () => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <span
          role="button"
          tabIndex={0}
          aria-label="More actions"
          title="More actions"
          onClick={(event) => event.stopPropagation()}
          className="size-7 rounded-full flex items-center justify-center transition-colors hover:bg-[color-mix(in_oklab,var(--color-ink)_10%,transparent)]"
          style={{ color: "color-mix(in oklab, var(--color-ink) 70%, transparent)" }}
        >
          <MoreHorizontal className="size-4" />
        </span>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        sideOffset={6}
        onClick={(event) => event.stopPropagation()}
        className="min-w-40"
      >
        <DropdownMenuItem
          onClick={(event) => {
            event.preventDefault();
            onStar();
          }}
          className="cursor-pointer gap-2.5"
        >
          <Star className="size-4" fill={isStarred ? "currentColor" : "none"} />
          {isStarred ? "Unstar" : "Star"}
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={(event) => {
            event.preventDefault();
            onRename();
          }}
          className="cursor-pointer gap-2.5"
        >
          <Pencil className="size-4" />
          Rename
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={(event) => {
            event.preventDefault();
            onTrash();
          }}
          className="cursor-pointer gap-2.5 text-red-600 focus:text-red-600"
        >
          <Trash2 className="size-4" />
          Move to Trash
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
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
  onTrash,
  onRename,
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
  onTrash: (file: DriveFile) => void;
  onRename: (file: DriveFile) => void;
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
                    <div className="ml-auto">
                      <ItemActionsMenu
                        isStarred={!!starred[f.id]}
                        onStar={() => onStar(f.id)}
                        onTrash={() => onTrash(f)}
                        onRename={() => onRename(f)}
                      />
                    </div>
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
  previewSrc,
  isStarred,
  onClose,
  onDownload,
  onShare,
  onStar,
  onDelete,
  mobile,
}: {
  file: DriveFile;
  previewSrc?: string;
  isStarred: boolean;
  onClose: () => void;
  onDownload: () => void;
  onShare: () => void;
  onStar: () => void;
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
          title={mobile ? "Back" : "Close"}
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
          <IconButton
            label="Download"
            onClick={() => {
              onDownload();
              toast("Download started", { icon: <Download className="size-4" /> });
            }}
            icon={<Download />}
            size="sm"
            variant="subtle"
            style={LIST_ICON_BUTTON_STYLE}
          />
          <IconButton
            label="Share"
            onClick={() => {
              void onShare();
            }}
            icon={<Share2 />}
            size="sm"
            variant="subtle"
            style={LIST_ICON_BUTTON_STYLE}
          />
          <IconButton
            label={isStarred ? "Unstar" : "Star"}
            onClick={onStar}
            active={isStarred}
            icon={<Star />}
            size="sm"
            variant="subtle"
            style={LIST_ICON_BUTTON_STYLE}
          />
          <IconButton
            label="Delete"
            onClick={onDelete}
            icon={<Trash2 />}
            size="sm"
            variant="subtle"
            style={LIST_ICON_BUTTON_STYLE}
          />
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
          {(file.kind === "image" || file.kind === "video") && previewSrc ? (
            file.kind === "video" ? (
              <video
                src={previewSrc}
                className="h-full w-full rounded-2xl object-cover"
                controls
                playsInline
                preload="metadata"
              />
            ) : (
              <img
                src={previewSrc}
                alt={file.title}
                className="h-full w-full rounded-2xl object-cover"
              />
            )
          ) : (
            <span className="[&>svg]:size-16">{kindIconLg[file.kind]}</span>
          )}
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
