import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronLeft, ChevronRight, ChevronUp, LayoutGrid, List, Loader2, Menu, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { DeleteItemModal } from "./DeleteItemModal";
import { FileIcon } from "./FileIcon";
import { DetailsPanel } from "./DetailsPanel";
import { DriveSidebar } from "./DriveSidebar";
import { DriveUploadModal } from "./DriveUploadModal";
import { FileCard } from "./FileCard";
import { FileItemMenu } from "./FileItemMenu";
import { FileRow } from "./FileRow";
import { RenameItemModal } from "./RenameItemModal";
import {
  type DriveFile,
  type FileKind,
  formatBytes,
  formatRelative,
  kindFromName,
} from "@/lib/files";
import {
  type DriveDirEntry,
  type DriveDirResponse,
  type DriveUserResponse,
  driveDownloadUrl,
  driveGet,
  drivePost,
  driveSearchFilenames,
  driveSyncSessionCwd,
} from "@/lib/driveApi";
import { purgeDriveRecentAfterDelete, recordDriveRecent } from "@/lib/driveRecent";
import { purgeDriveStarredAfterDelete, toggleDriveStarred } from "@/lib/driveStarred";
import { useDriveLocalLists } from "@/lib/useDriveLocalLists";
import { canOpenInOfficePath, officeEditorHref } from "@/lib/officeLink";
import { cn } from "@/lib/utils";

function toDriveFile(entry: DriveDirEntry, ownerName: string, ownerAv: string): DriveFile | null {
  if (entry.type === "back") return null;
  const isDir = entry.type === "dir";
  const iso = new Date((entry.time || 0) * 1000).toISOString();
  return {
    id: entry.path,
    path: entry.path,
    name: entry.name,
    kind: kindFromName(entry.name, isDir),
    size: isDir ? undefined : formatBytes(entry.size),
    sizeBytes: typeof entry.size === "number" ? entry.size : undefined,
    modified: iso,
    owner: { name: ownerName, avatar: ownerAv },
  };
}

const DIR_QUERY_KEY = "dir";

/** Safe WebDAV-style cwd from `?dir=` for deep links (reload / share URL). */
function normalizeDirFromQuery(encoded: string | null | undefined): string {
  if (encoded == null || encoded === "") return "/";
  let s: string;
  try {
    s = decodeURIComponent(encoded);
  } catch {
    return "/";
  }
  s = s.trim().replace(/\/+/g, "/");
  if (!s.startsWith("/")) s = `/${s}`;
  const segments = s.split("/").filter(Boolean);
  if (segments.some((seg) => seg === "..")) return "/";
  if (s === "/") return "/";
  return s.endsWith("/") ? s : `${s}/`;
}

function initialCwdFromLocation(): string {
  if (typeof window === "undefined") return "/";
  return normalizeDirFromQuery(new URLSearchParams(window.location.search).get(DIR_QUERY_KEY));
}

function breadcrumbParts(cwd: string): { label: string; path: string }[] {
  const parts: { label: string; path: string }[] = [{ label: "Drive", path: "/" }];
  const raw = cwd === "/" ? "" : cwd.replace(/\/$/, "");
  if (!raw) return parts;
  const segs = raw.split("/").filter(Boolean);
  let acc = "";
  for (const s of segs) {
    acc = `${acc}/${s}`;
    parts.push({ label: s, path: acc.endsWith("/") ? acc : `${acc}/` });
  }
  return parts;
}

type DriveSection = "my" | "recent" | "starred";

type DriveKindFilter = "all" | "folder" | "doc" | "sheet" | "slide" | "image";

type ListSortColumn = "name" | "owner" | "modified" | "size";

const nameCollator = new Intl.Collator(undefined, { numeric: true, sensitivity: "base" });

function sortDriveFiles(
  files: DriveFile[],
  sort: { column: ListSortColumn; dir: "asc" | "desc" },
): DriveFile[] {
  const mul = sort.dir === "asc" ? 1 : -1;
  const cmp = (a: DriveFile, b: DriveFile): number => {
    switch (sort.column) {
      case "name":
        return nameCollator.compare(a.name, b.name) * mul;
      case "owner":
        return nameCollator.compare(a.owner.name, b.owner.name) * mul;
      case "modified":
        return (new Date(a.modified).getTime() - new Date(b.modified).getTime()) * mul;
      case "size":
        return ((a.sizeBytes ?? 0) - (b.sizeBytes ?? 0)) * mul;
      default:
        return 0;
    }
  };
  return [...files].sort(cmp);
}

function matchesFilterAndQuery(name: string, kind: FileKind, filter: DriveKindFilter, query: string): boolean {
  if (filter !== "all" && kind !== filter) return false;
  if (query && !name.toLowerCase().includes(query.toLowerCase())) return false;
  return true;
}

function useDebouncedValue<T>(value: T, ms: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = window.setTimeout(() => setDebounced(value), ms);
    return () => window.clearTimeout(id);
  }, [value, ms]);
  return debounced;
}

/** WebDAV-style folder path containing the item (for search result context). */
function parentFolderHint(path: string): string {
  const norm = path.replace(/\/+/g, "/");
  const trimmed = norm.replace(/\/$/, "");
  if (trimmed === "" || trimmed === "/") {
    return "/";
  }
  const i = trimmed.lastIndexOf("/");
  if (i <= 0) {
    return "/";
  }
  return `${trimmed.slice(0, i + 1)}`;
}

function ListSortHeaderButton({
  column,
  label,
  sort,
  onSort,
  className,
}: {
  column: ListSortColumn;
  label: string;
  sort: { column: ListSortColumn; dir: "asc" | "desc" } | null;
  onSort: (column: ListSortColumn) => void;
  className?: string;
}) {
  const active = sort !== null && sort.column === column;
  const Icon = active && sort ? (sort.dir === "asc" ? ChevronUp : ChevronDown) : null;
  return (
    <button
      type="button"
      onClick={() => onSort(column)}
      className={cn(
        "inline-flex items-center gap-1 w-full text-[11px] font-semibold uppercase tracking-wider transition-colors hover:text-foreground",
        active ? "text-foreground" : "text-muted-foreground",
        className,
      )}
      aria-sort={active && sort ? (sort.dir === "asc" ? "ascending" : "descending") : "none"}
    >
      {label}
      {Icon ? <Icon className="h-3.5 w-3.5 shrink-0 opacity-90" aria-hidden /> : null}
    </button>
  );
}

function readLogoutUrl(): string {
  if (typeof window === "undefined") return "/logout/";
  const configured = window.__SABRE_DRIVE_CONFIG__?.logoutUrl?.trim();
  if (configured) return configured;
  const m = window.location.pathname.match(/^(.*)\/drive(?:\/.*)?$/);
  const base = m ? m[1] : "";
  const normalized = `${base}/logout/`.replace(/\/+/g, "/");
  return normalized.startsWith("/") ? normalized : `/${normalized}`;
}

export function Drive() {
  const queryClient = useQueryClient();
  const [view, setView] = useState<"grid" | "list">("grid");
  const [section, setSection] = useState<DriveSection>("my");
  const [cwd, setCwd] = useState(initialCwdFromLocation);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<DriveFile | null>(null);
  const [renameTarget, setRenameTarget] = useState<DriveFile | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DriveFile | null>(null);
  const [filter, setFilter] = useState<DriveKindFilter>("all");
  const logoutUrl = readLogoutUrl();
  const [listSort, setListSort] = useState<{ column: ListSortColumn; dir: "asc" | "desc" } | null>(null);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  useEffect(() => {
    setMobileSidebarOpen(false);
  }, [section]);

  const { data: userData } = useQuery({
    queryKey: ["drive-user"],
    queryFn: async () => driveGet<DriveUserResponse>("/getuser"),
  });

  useEffect(() => {
    const url = new URL(window.location.href);
    if (cwd === "/") url.searchParams.delete(DIR_QUERY_KEY);
    else url.searchParams.set(DIR_QUERY_KEY, cwd);
    const nextSearch = url.searchParams.toString();
    const next = nextSearch ? `${url.pathname}?${nextSearch}` : url.pathname;
    if (next !== `${window.location.pathname}${window.location.search}`) {
      window.history.replaceState(null, "", next + window.location.hash);
    }
  }, [cwd]);

  useEffect(() => {
    if (section !== "my") return;
    void driveSyncSessionCwd(cwd).catch(() => {
      /* session sync is best-effort; listing still sends explicit dir */
    });
  }, [cwd, section]);

  const ownerName = userData?.data?.name || userData?.data?.username || "You";
  const ownerAv = (ownerName
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase()) || "ME";

  const { recent: recentEntries, starred: starredEntries } = useDriveLocalLists();
  const starredPaths = useMemo(() => new Set(starredEntries.map((s) => s.path)), [starredEntries]);

  const driveFileFromStored = useCallback(
    (entry: { path: string; name: string; kind: FileKind }, options?: { openedAt?: number; forceStarred?: boolean }): DriveFile => ({
      id: entry.path,
      path: entry.path,
      name: entry.name,
      kind: entry.kind,
      modified: options?.openedAt != null ? new Date(options.openedAt).toISOString() : new Date(0).toISOString(),
      owner: { name: ownerName, avatar: ownerAv },
      starred: options?.forceStarred === true ? true : starredPaths.has(entry.path),
    }),
    [ownerName, ownerAv, starredPaths],
  );

  const { data: listing, isPending, isError, error, refetch } = useQuery({
    queryKey: ["drive-dir", cwd, section],
    enabled: section === "my",
    queryFn: async () => drivePost<DriveDirResponse>("/getdir", { dir: cwd }),
  });

  const debouncedDriveSearch = useDebouncedValue(query, 320);
  const trimmedDriveSearch = query.trim();
  const driveSearchActive = section === "my" && trimmedDriveSearch.length >= 2;
  const debouncedTrimmed = debouncedDriveSearch.trim();

  const { data: driveSearchResponse, isFetching: driveSearchFetching } = useQuery({
    queryKey: ["drive-search", debouncedTrimmed],
    enabled: driveSearchActive && debouncedTrimmed.length >= 2,
    staleTime: 30_000,
    queryFn: async () => driveSearchFilenames(debouncedTrimmed, { limit: 50 }),
  });

  const driveSearchAwaitingDebounce =
    driveSearchActive && debouncedTrimmed !== trimmedDriveSearch;
  /** Full-panel spinner only before we have any response for the current debounced query. */
  const driveSearchLoading =
    driveSearchAwaitingDebounce || (driveSearchFetching && driveSearchResponse == null);

  const driveSearchFiles = useMemo((): DriveFile[] => {
    if (!driveSearchActive || !driveSearchResponse?.data?.files) return [];
    const out: DriveFile[] = [];
    for (const e of driveSearchResponse.data.files) {
      const f = toDriveFile(e, ownerName, ownerAv);
      if (f) out.push({ ...f, starred: starredPaths.has(f.path) });
    }
    return out;
  }, [driveSearchActive, driveSearchResponse, ownerName, ownerAv, starredPaths]);

  const files = useMemo(() => {
    if (section !== "my" || !listing?.data?.files) return [];
    const out: DriveFile[] = [];
    for (const e of listing.data.files) {
      const f = toDriveFile(e, ownerName, ownerAv);
      if (f) out.push(f);
    }
    return out
      .filter((f) => matchesFilterAndQuery(f.name, f.kind, filter, ""))
      .map((f) => ({ ...f, starred: starredPaths.has(f.path) }));
  }, [listing, section, filter, ownerName, ownerAv, starredPaths]);

  const libraryFiles = useMemo((): DriveFile[] => {
    if (section === "recent") {
      return recentEntries
        .filter((e) => matchesFilterAndQuery(e.name, e.kind, filter, query))
        .map((e) => driveFileFromStored(e, { openedAt: e.openedAt }));
    }
    if (section === "starred") {
      return starredEntries
        .filter((e) => matchesFilterAndQuery(e.name, e.kind, filter, query))
        .map((e) => ({ ...driveFileFromStored(e), starred: true }));
    }
    return [];
  }, [section, recentEntries, starredEntries, filter, query, driveFileFromStored]);

  const displayFiles = section === "my" ? files : libraryFiles;
  const sortedDisplayFiles = useMemo(() => {
    if (!listSort) return displayFiles;
    return sortDriveFiles(displayFiles, listSort);
  }, [displayFiles, listSort]);

  const folders = sortedDisplayFiles.filter((f) => f.kind === "folder");
  const others = sortedDisplayFiles.filter((f) => f.kind !== "folder");

  const toggleListSort = useCallback((column: ListSortColumn) => {
    setListSort((prev) => {
      if (prev?.column === column) {
        return { column, dir: prev.dir === "asc" ? "desc" : "asc" };
      }
      return { column, dir: column === "modified" ? "desc" : "asc" };
    });
  }, []);

  const openFolder = useCallback((f: DriveFile) => {
    if (f.kind !== "folder") return;
    recordDriveRecent({ path: f.path, name: f.name, kind: f.kind });
    const next = f.path.endsWith("/") ? f.path : `${f.path}/`;
    setCwd(next);
    setSelected(null);
    setMobileSidebarOpen(false);
  }, []);

  const openInOffice = useCallback((f: DriveFile) => {
    const href = officeEditorHref(f.path);
    if (href) {
      recordDriveRecent({ path: f.path, name: f.name, kind: f.kind });
      window.open(href, "_blank", "noopener,noreferrer");
    }
  }, []);

  const openFilePreview = useCallback((f: DriveFile) => {
    if (f.kind === "image") {
      recordDriveRecent({ path: f.path, name: f.name, kind: f.kind });
      window.open(driveDownloadUrl(f.path), "_blank", "noopener,noreferrer");
      return;
    }
    openInOffice(f);
  }, [openInOffice]);

  const beginRename = useCallback((f: DriveFile) => {
    setRenameTarget(f);
  }, []);

  const beginDelete = useCallback((f: DriveFile) => {
    setDeleteTarget(f);
  }, []);

  const handleDeleteSuccess = useCallback(
    (f: DriveFile) => {
      const isFolder = f.kind === "folder";
      const deletedNorm = f.path.replace(/\/+$/, "") || "/";
      const under = deletedNorm === "/" ? "" : `${deletedNorm}/`;
      purgeDriveStarredAfterDelete(f.path, isFolder);
      purgeDriveRecentAfterDelete(f.path, isFolder);
      if (isFolder) {
        const cwdNorm = cwd.replace(/\/+$/, "") || "/";
        if (cwdNorm === deletedNorm || (under !== "" && cwd.startsWith(under))) {
          const par = deletedNorm.includes("/") ? deletedNorm.slice(0, deletedNorm.lastIndexOf("/")) : "";
          setCwd(par === "" ? "/" : `${par}/`);
        }
      }
      setDeleteTarget(null);
      setSelected((s) => {
        if (!s) return null;
        if (s.path === f.path) return null;
        if (isFolder && under !== "") {
          const base = `${deletedNorm}/`;
          if (s.path === deletedNorm || s.path.startsWith(base)) return null;
        }
        return s;
      });
      void queryClient.invalidateQueries({ queryKey: ["drive-dir"] });
    },
    [cwd, queryClient],
  );

  const toggleStar = useCallback(
    (f: DriveFile) => {
      const nowStarred = toggleDriveStarred({ path: f.path, name: f.name, kind: f.kind });
      if (section === "starred" && !nowStarred) setSelected(null);
    },
    [section],
  );

  const openFromLibrary = useCallback(
    (f: DriveFile) => {
      if (f.kind === "folder") {
        setSection("my");
        openFolder(f);
        return;
      }
      if (canOpenInOfficePath(f.path)) {
        openInOffice(f);
        return;
      }
      setSelected(f);
    },
    [openFolder, openInOffice],
  );

  const pickDriveSearchResult = useCallback(
    (f: DriveFile) => {
      setQuery("");
      if (f.kind === "folder") {
        setSection("my");
        openFolder(f);
        return;
      }
      if (canOpenInOfficePath(f.path)) {
        openInOffice(f);
        return;
      }
      if (f.kind === "image") {
        recordDriveRecent({ path: f.path, name: f.name, kind: f.kind });
        window.open(driveDownloadUrl(f.path), "_blank", "noopener,noreferrer");
        return;
      }
      setSection("my");
      setSelected(f);
    },
    [openFolder, openInOffice],
  );

  const crumbs = useMemo(() => breadcrumbParts(cwd), [cwd]);
  const mobileParentCrumb =
    section === "my" && crumbs.length > 1 ? crumbs[crumbs.length - 2] : null;
  const driveHeading = section === "my" ? (crumbs[crumbs.length - 1]?.label ?? "Drive") : null;

  const selectedMerged = useMemo((): DriveFile | null => {
    if (!selected) return null;
    return { ...selected, starred: starredPaths.has(selected.path) };
  }, [selected, starredPaths]);

  const canShowFiles =
    (section === "my" && !isPending && !isError) || section === "recent" || section === "starred";

  return (
    <div className="h-screen w-full flex bg-background overflow-hidden">
      <div className="hidden md:block">
        <DriveSidebar
          active={section}
          onSelect={(id) => setSection(id as DriveSection)}
          cwd={cwd}
          myDrive={section === "my"}
          logoutUrl={logoutUrl}
          onRefreshListing={() => void queryClient.invalidateQueries({ queryKey: ["drive-dir"] })}
          onOpenUpload={() => setUploadModalOpen(true)}
        />
      </div>
      <Sheet open={mobileSidebarOpen} onOpenChange={setMobileSidebarOpen}>
        <SheetContent
          side="left"
          id="drive-mobile-nav"
          className="w-64 max-w-[85vw] border-r border-border bg-sidebar p-0 md:hidden"
        >
          <SheetHeader className="sr-only">
            <SheetTitle>Drive navigation</SheetTitle>
          </SheetHeader>
          <DriveSidebar
            active={section}
            onSelect={(id) => {
              setSection(id as DriveSection);
              setMobileSidebarOpen(false);
            }}
            cwd={cwd}
            myDrive={section === "my"}
            logoutUrl={logoutUrl}
            onRefreshListing={() => void queryClient.invalidateQueries({ queryKey: ["drive-dir"] })}
            onOpenUpload={() => {
              setUploadModalOpen(true);
              setMobileSidebarOpen(false);
            }}
          />
        </SheetContent>
      </Sheet>

      <main className="flex-1 flex flex-col min-w-0">
        <header className="h-16 border-b border-border flex items-center gap-3 md:gap-4 px-4 md:px-6 shrink-0">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setMobileSidebarOpen(true)}
            aria-label="Open drive navigation"
            aria-expanded={mobileSidebarOpen}
            aria-controls="drive-mobile-nav"
          >
            <Menu className="h-5 w-5" />
          </Button>
          <div className="hidden md:flex items-center gap-1 text-sm min-w-0 flex-wrap">
            {section === "my" ? (
              crumbs.map((c, i) => (
                <span key={c.path} className="flex items-center gap-1 min-w-0">
                  {i > 0 && <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />}
                  <button
                    type="button"
                    onClick={() => {
                      setCwd(c.path === "/" ? "/" : c.path.endsWith("/") ? c.path : `${c.path}/`);
                      setSelected(null);
                    }}
                    className={cn(
                      "truncate max-w-[10rem] sm:max-w-[14rem]",
                      i === crumbs.length - 1 ? "font-medium text-foreground" : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {c.label}
                  </button>
                </span>
              ))
            ) : (
              <div className="flex items-center gap-1 text-sm min-w-0">
                <button
                  type="button"
                  onClick={() => {
                    setSection("my");
                    setSelected(null);
                  }}
                  className="text-muted-foreground hover:text-foreground truncate"
                >
                  My Drive
                </button>
                <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <span className="font-medium text-foreground truncate">
                  {section === "recent" ? "Recent" : "Starred"}
                </span>
              </div>
            )}
          </div>
          <div className="flex-1 max-w-xl mx-auto min-w-0">
            <div className="relative z-30">
              <Search className="h-4 w-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (section === "my" && e.key === "Escape") {
                    setQuery("");
                  }
                }}
                placeholder={section === "my" ? "Search files..." : "Search…"}
                className="pl-10 h-10 bg-muted/50 border-transparent focus-visible:bg-surface focus-visible:border-border rounded-xl shadow-[var(--shadow-soft)]"
                aria-autocomplete={section === "my" ? "list" : undefined}
                aria-controls={section === "my" ? "drive-search-results" : undefined}
                aria-expanded={section === "my" ? driveSearchActive : undefined}
              />
              {section === "my" && driveSearchActive && (
                <div
                  id="drive-search-results"
                  role="listbox"
                  aria-busy={driveSearchLoading || driveSearchFetching}
                  className="absolute left-0 right-0 top-[calc(100%+0.35rem)] rounded-xl border border-border bg-surface/95 backdrop-blur-md shadow-[var(--shadow-soft)] overflow-hidden"
                >
                  {driveSearchLoading ? (
                    <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin shrink-0" aria-hidden />
                      Searching…
                    </div>
                  ) : driveSearchFiles.length === 0 ? (
                    <div className="py-10 px-4 text-center text-sm text-muted-foreground">No matching filenames</div>
                  ) : (
                    <div className="relative">
                      {driveSearchFetching ? (
                        <div className="absolute right-2 top-2 z-10 flex h-7 w-7 items-center justify-center rounded-md bg-surface/90 border border-border/60 shadow-sm">
                          <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" aria-label="Refreshing" />
                        </div>
                      ) : null}
                      <ul className="max-h-[min(22rem,50vh)] overflow-y-auto py-1">
                        {driveSearchFiles.map((f) => (
                          <li key={f.id} role="presentation">
                            <button
                              type="button"
                              role="option"
                              className="w-full flex items-start gap-3 px-3 py-2.5 text-left text-sm transition-colors hover:bg-accent/80 focus-visible:bg-accent/80 focus-visible:outline-none"
                              onMouseDown={(e) => e.preventDefault()}
                              onClick={() => pickDriveSearchResult(f)}
                            >
                              <span className="shrink-0 mt-0.5">
                                <FileIcon kind={f.kind} size="sm" />
                              </span>
                              <span className="min-w-0 flex-1">
                                <span className="font-medium text-foreground block truncate">{f.name}</span>
                                <span className="text-xs text-muted-foreground block truncate mt-0.5">
                                  {parentFolderHint(f.path)}
                                </span>
                              </span>
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <div className="h-9 w-9 rounded-full bg-gradient-to-br from-primary to-[oklch(0.55_0.15_285)] text-primary-foreground flex items-center justify-center text-xs font-semibold ring-2 ring-background shadow-[var(--shadow-soft)]">
              {ownerAv}
            </div>
          </div>
        </header>

        <div className="px-6 pt-5 pb-3 md:px-8 md:pt-8 md:pb-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between md:gap-4">
            <div className="w-full min-w-0">
              {mobileParentCrumb && (
                <button
                  type="button"
                  onClick={() => {
                    setCwd(mobileParentCrumb.path === "/" ? "/" : mobileParentCrumb.path);
                    setSelected(null);
                  }}
                  className="mb-2 inline-flex min-h-9 items-center gap-2 rounded-md px-2 text-sm font-medium text-muted-foreground hover:text-foreground md:hidden"
                >
                  <ChevronLeft className="h-4 w-4" />
                  {mobileParentCrumb.label}
                </button>
              )}
              <h1 className="w-full text-4xl font-display italic leading-none">
                {section === "my" ? driveHeading : section === "recent" ? "Recent" : "Starred"}
              </h1>
              <p className="mt-2 text-sm text-muted-foreground">
                {section === "my" ? (
                  <>{files.length} items in this folder</>
                ) : section === "recent" ? (
                  <>{libraryFiles.length} recently opened</>
                ) : (
                  <>{libraryFiles.length} starred items</>
                )}
              </p>
            </div>
            {(section === "my" || section === "recent" || section === "starred") && (
              <div className="flex w-full items-center gap-2 sm:w-auto">
                <div className="flex-1 md:hidden">
                  <Select value={filter} onValueChange={(v) => setFilter(v as DriveKindFilter)}>
                    <SelectTrigger className="h-9 min-w-[11rem] bg-muted/60 border-border/70">
                      <SelectValue placeholder="Filter type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="folder">Folders</SelectItem>
                      <SelectItem value="doc">Docs</SelectItem>
                      <SelectItem value="sheet">Sheets</SelectItem>
                      <SelectItem value="slide">Slides</SelectItem>
                      <SelectItem value="image">Media</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="md:hidden flex items-center rounded-lg border border-border bg-surface p-0.5">
                  <button
                    type="button"
                    onClick={() => setView("grid")}
                    className={cn(
                      "h-7 w-7 rounded-md flex items-center justify-center transition-colors",
                      view === "grid" ? "bg-accent" : "text-muted-foreground hover:text-foreground",
                    )}
                    aria-label="Grid view"
                  >
                    <LayoutGrid className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setView("list")}
                    className={cn(
                      "h-7 w-7 rounded-md flex items-center justify-center transition-colors",
                      view === "list" ? "bg-accent" : "text-muted-foreground hover:text-foreground",
                    )}
                    aria-label="List view"
                  >
                    <List className="h-3.5 w-3.5" />
                  </button>
                </div>
                <div className="hidden md:block">
                  <Tabs value={filter} onValueChange={(v) => setFilter(v as typeof filter)}>
                    <TabsList className="bg-muted/60">
                      <TabsTrigger value="all">All</TabsTrigger>
                      <TabsTrigger value="folder">Folders</TabsTrigger>
                      <TabsTrigger value="doc">Docs</TabsTrigger>
                      <TabsTrigger value="sheet">Sheets</TabsTrigger>
                      <TabsTrigger value="slide">Slides</TabsTrigger>
                      <TabsTrigger value="image">Media</TabsTrigger>
                    </TabsList>
                  </Tabs>
                </div>
              </div>
            )}
          </div>

          {(section === "my" || section === "recent" || section === "starred") && (
            <div className="mt-6 hidden md:flex items-center justify-end border-b border-border pb-3">
              <div className="flex items-center rounded-lg border border-border bg-surface p-0.5">
                <button
                  type="button"
                  onClick={() => setView("grid")}
                  className={cn(
                    "h-7 w-7 rounded-md flex items-center justify-center transition-colors",
                    view === "grid" ? "bg-accent" : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  <LayoutGrid className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setView("list")}
                  className={cn(
                    "h-7 w-7 rounded-md flex items-center justify-center transition-colors",
                    view === "list" ? "bg-accent" : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  <List className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto px-6 pb-5 md:px-8 md:pb-8">
          {section === "my" && isPending && (
            <div className="py-24 text-center text-muted-foreground text-sm">Loading…</div>
          )}

          {section === "my" && isError && (
            <div className="py-24 text-center space-y-3">
              <p className="text-destructive text-sm">{(error as Error).message}</p>
              <Button type="button" variant="outline" size="sm" onClick={() => refetch()}>
                Retry
              </Button>
            </div>
          )}

          {canShowFiles && view === "grid" && (
            <>
              {folders.length > 0 && (
                <section>
                  <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Folders</h2>
                  <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-2.5 md:gap-3">
                    {folders.map((f) => (
                      <div
                        key={f.id}
                        role="button"
                        tabIndex={0}
                        onClick={() => (section === "my" ? openFolder(f) : openFromLibrary(f))}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            section === "my" ? openFolder(f) : openFromLibrary(f);
                          }
                        }}
                        className={cn(
                          "group relative flex items-center gap-3 p-3 md:p-4 rounded-xl border bg-surface text-left transition-all cursor-default",
                          "hover:-translate-y-0.5 hover:shadow-[var(--shadow-soft)] hover:border-foreground/20",
                          selected?.id === f.id ? "ring-2 ring-ring border-ring" : "border-border",
                        )}
                      >
                        <div
                          className="absolute top-3 right-3 z-10 opacity-0 transition-opacity group-hover:opacity-100"
                          onClick={(e) => e.stopPropagation()}
                          onPointerDown={(e) => e.stopPropagation()}
                        >
                          <FileItemMenu
                            onRename={section === "my" ? () => beginRename(f) : undefined}
                            onDelete={() => beginDelete(f)}
                            onToggleStar={() => toggleStar(f)}
                            starred={f.starred}
                            triggerClassName="bg-surface/90 backdrop-blur border border-border/60 shadow-sm"
                          />
                        </div>
                        <div className="h-10 w-10 rounded-lg bg-folder/10 flex items-center justify-center shrink-0">
                          <svg className="h-5 w-5 text-folder" viewBox="0 0 24 24" fill="currentColor">
                            <title>folder</title>
                            <path d="M2 6a2 2 0 0 1 2-2h5l2 2h7a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6Z" />
                          </svg>
                        </div>
                        <div className="min-w-0 flex-1 pr-10">
                          <div className="text-sm font-medium truncate">{f.name}</div>
                          <div className="text-xs text-muted-foreground mt-0.5">{formatRelative(f.modified)}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {others.length > 0 && (
                <section className="mt-8">
                  <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Files</h2>
                  <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-3 md:gap-4">
                    {others.map((f) => (
                      <FileCard
                        key={f.id}
                        file={f}
                        selected={selected?.id === f.id}
                        onClick={() => setSelected(f)}
                        onOpenInOffice={
                          f.kind === "image" || canOpenInOfficePath(f.path) ? () => openFilePreview(f) : undefined
                        }
                        onRenameRequest={section === "my" ? beginRename : undefined}
                        onDeleteRequest={beginDelete}
                        onToggleStar={toggleStar}
                      />
                    ))}
                  </div>
                </section>
              )}
            </>
          )}

          {canShowFiles && view === "list" && sortedDisplayFiles.length > 0 && (
            <div className="rounded-xl border border-border bg-surface overflow-hidden">
              <div className="grid grid-cols-[minmax(0,1fr)_40px] md:grid-cols-[minmax(0,1fr)_160px_120px_100px_40px] gap-2.5 md:gap-4 px-3 md:px-5 py-2.5 border-b border-border bg-muted/40 items-center">
                <ListSortHeaderButton column="name" label="Name" sort={listSort} onSort={toggleListSort} className="text-left" />
                <ListSortHeaderButton column="owner" label="Owner" sort={listSort} onSort={toggleListSort} className="hidden md:inline-flex text-left" />
                <ListSortHeaderButton column="modified" label="Modified" sort={listSort} onSort={toggleListSort} className="hidden md:inline-flex text-left" />
                <ListSortHeaderButton column="size" label="Size" sort={listSort} onSort={toggleListSort} className="hidden md:inline-flex text-right justify-end" />
                <span className="block min-h-4 w-7 shrink-0" aria-hidden />
              </div>
              <div className="p-1 md:p-1.5">
                {sortedDisplayFiles.map((f) => (
                  <FileRow
                    key={f.id}
                    file={f}
                    selected={selected?.id === f.id}
                    onClick={() =>
                      f.kind === "folder" ? (section === "my" ? openFolder(f) : openFromLibrary(f)) : setSelected(f)
                    }
                    onOpenInOffice={
                      f.kind !== "folder" && (f.kind === "image" || canOpenInOfficePath(f.path))
                        ? () => openFilePreview(f)
                        : undefined
                    }
                    onRenameRequest={section === "my" ? beginRename : undefined}
                    onDeleteRequest={beginDelete}
                    onToggleStar={toggleStar}
                  />
                ))}
              </div>
            </div>
          )}

          {canShowFiles && displayFiles.length === 0 && (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <div className="h-16 w-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
                <Search className="h-7 w-7 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-display italic">
                {section === "my"
                  ? "This folder is empty"
                  : section === "recent"
                    ? "Nothing recent yet"
                    : "No starred items"}
              </h3>
              <p className="text-sm text-muted-foreground mt-1 max-w-sm">
                {section === "my"
                  ? "Use New → Upload files or New folder, or any WebDAV client."
                  : section === "recent"
                    ? "Open a folder or an Office document from My Drive; it will show up here on this device."
                    : "Use the ⋮ menu on a file or folder, or the star action in Details, to add a shortcut here."}
              </p>
            </div>
          )}
        </div>
      </main>

      <DriveUploadModal
        open={uploadModalOpen}
        cwd={cwd}
        onClose={() => setUploadModalOpen(false)}
        onComplete={() => void queryClient.invalidateQueries({ queryKey: ["drive-dir"] })}
      />

      {renameTarget && (
        <RenameItemModal
          file={renameTarget}
          cwd={cwd}
          onClose={() => setRenameTarget(null)}
          onSuccess={() => {
            const was = renameTarget;
            setRenameTarget(null);
            setSelected((s) => (s?.id === was.id ? null : s));
            void queryClient.invalidateQueries({ queryKey: ["drive-dir"] });
          }}
        />
      )}

      {deleteTarget && (
        <DeleteItemModal
          file={deleteTarget}
          onClose={() => setDeleteTarget(null)}
          onSuccess={(f) => handleDeleteSuccess(f)}
        />
      )}

      {selectedMerged && (
        <DetailsPanel
          file={selectedMerged}
          onClose={() => setSelected(null)}
          onOpenInOffice={() => openFilePreview(selectedMerged)}
          onToggleStar={() => toggleStar(selectedMerged)}
          onDeleteRequest={() => beginDelete(selectedMerged)}
        />
      )}
    </div>
  );
}
