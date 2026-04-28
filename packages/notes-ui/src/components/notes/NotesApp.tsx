import { useEffect, useMemo, useRef, useState } from "react";
import {
  Search,
  Plus,
  Notebook,
  Star,
  Archive,
  ArchiveRestore,
  Trash2,
  X,
  Hash,
  Sparkles,
  PanelLeftClose,
  PanelLeft,
  Pencil,
  FileQuestion,
  LogOut,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { Menu, ArrowLeft } from "lucide-react";
import { NewNotebookDialog } from "./NewNotebookDialog";
import { DeleteNotebookDialog, type DeleteNotebookAction } from "./DeleteNotebookDialog";
import { readNotesConfig } from "@/lib/notes-config";
import { loadNotes, notebookListFromNotes, syncNotes, type StoredNote } from "@/lib/notes-storage";

type FilterState = { type: "all" | "starred" | "notebook" | "tag" | "archive"; value?: string };

type Note = {
  id: string;
  title: string;
  body: string;
  notebook: string;
  tags: string[];
  updatedAt: Date;
  starred?: boolean;
};

const SYNC_DEBOUNCE_MS = 700;

function formatTime(d: Date) {
  const diff = Date.now() - d.getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return "just now";
  if (min < 60) return `${min}m ago`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}h ago`;
  const day = Math.floor(h / 24);
  if (day < 7) return `${day}d ago`;
  // Locale-stable to avoid SSR/client hydration mismatch
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${months[d.getMonth()]} ${d.getDate()}`;
}

export function NotesApp() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [activeId, setActiveId] = useState<string>("");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<FilterState>({ type: "all" });
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [notebooks, setNotebooks] = useState<string[]>([]);
  const [archivedIds, setArchivedIds] = useState<Set<string>>(new Set());
  const [loadError, setLoadError] = useState<string>("");
  const [syncError, setSyncError] = useState<string>("");
  const [ready, setReady] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  // On mobile: "list" shows the note list, "detail" shows the editor
  const [mobileView, setMobileView] = useState<"list" | "detail">("list");
  const [addingTag, setAddingTag] = useState(false);
  const [tagDraft, setTagDraft] = useState("");
  const [notebookDialogOpen, setNotebookDialogOpen] = useState(false);
  // When the dialog creates a notebook, optionally assign it to the active note
  const [assignNewNotebookToActive, setAssignNewNotebookToActive] = useState(false);
  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const [renameTarget, setRenameTarget] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const configRef = useRef<ReturnType<typeof readNotesConfig> | null>(null);
  const syncTimeoutRef = useRef<number | null>(null);

  const allTags = useMemo(
    () =>
      [...new Set(notes.flatMap((note) => note.tags))]
        .filter(Boolean)
        .sort((a, b) => a.localeCompare(b)),
    [notes],
  );

  useEffect(() => {
    let cancelled = false;
    try {
      configRef.current = readNotesConfig();
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "Could not read notes configuration.");
      setReady(true);
      return;
    }

    const config = configRef.current;
    if (!config) {
      setReady(true);
      return;
    }

    void (async () => {
      try {
        const loaded: StoredNote[] = await loadNotes(config.baseUri, config.username);
        if (cancelled) return;
        setNotes(loaded);
        setNotebooks(notebookListFromNotes(loaded));
        if (loaded.length > 0) {
          setActiveId(loaded[0].id);
        }
        setHydrated(true);
      } catch (error) {
        if (!cancelled) {
          setLoadError(error instanceof Error ? error.message : "Could not load notes.");
        }
      } finally {
        if (!cancelled) {
          setReady(true);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!ready || !hydrated || !configRef.current) return;
    if (syncTimeoutRef.current !== null) {
      window.clearTimeout(syncTimeoutRef.current);
    }
    syncTimeoutRef.current = window.setTimeout(() => {
      const config = configRef.current;
      if (!config) return;
      void syncNotes(config.baseUri, config.username, notes)
        .then(() => setSyncError(""))
        .catch((error) =>
          setSyncError(error instanceof Error ? error.message : "Could not sync notes to WebDAV."),
        );
    }, SYNC_DEBOUNCE_MS);

    return () => {
      if (syncTimeoutRef.current !== null) {
        window.clearTimeout(syncTimeoutRef.current);
      }
    };
  }, [notes, archivedIds, ready, hydrated]);

  const filtered = useMemo(() => {
    // Archive is its own world; everything else excludes archived notes.
    let list =
      filter.type === "archive"
        ? notes.filter((n) => archivedIds.has(n.id))
        : notes.filter((n) => !archivedIds.has(n.id));
    if (filter.type === "starred") list = list.filter((n) => n.starred);
    if (filter.type === "notebook") {
      if (filter.value === "__unassigned__") {
        list = list.filter((n) => !n.notebook || !notebooks.includes(n.notebook));
      } else {
        list = list.filter((n) => n.notebook === filter.value);
      }
    }
    if (filter.type === "tag") list = list.filter((n) => n.tags.includes(filter.value!));
    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter(
        (n) =>
          n.title.toLowerCase().includes(q) ||
          n.body.toLowerCase().includes(q) ||
          n.tags.some((t) => t.toLowerCase().includes(q)),
      );
    }
    return [...list].sort((a, b) => {
      if (!!b.starred !== !!a.starred) return Number(!!b.starred) - Number(!!a.starred);
      return b.updatedAt.getTime() - a.updatedAt.getTime();
    });
  }, [notes, filter, query, notebooks, archivedIds]);

  const active = notes.find((n) => n.id === activeId) ?? filtered[0];

  function updateActive(patch: Partial<Note>) {
    if (!active) return;
    setNotes((prev) =>
      prev.map((n) => (n.id === active.id ? { ...n, ...patch, updatedAt: new Date() } : n)),
    );
  }

  function newNote() {
    const notebookFromFilter =
      filter.type === "notebook" && filter.value && filter.value !== "__unassigned__"
        ? filter.value
        : "";
    const notebook = notebookFromFilter || notebooks[0] || "General";
    const n: Note = {
      id: `n${Date.now()}`,
      title: "Untitled",
      body: "",
      notebook,
      tags: [],
      updatedAt: new Date(),
    };
    setNotes((p) => [n, ...p]);
    setNotebooks((prev) => (prev.includes(notebook) ? prev : [...prev, notebook].sort()));
    setActiveId(n.id);
    setMobileView("detail");
  }

  function archiveActive() {
    if (!active) return;
    if (filter.type === "archive") {
      // Permanent delete from archive
      setNotes((p) => p.filter((n) => n.id !== active.id));
      setArchivedIds((prev) => {
        const next = new Set(prev);
        next.delete(active.id);
        return next;
      });
    } else {
      // Move to archive
      setArchivedIds((prev) => {
        const next = new Set(prev);
        next.add(active.id);
        return next;
      });
    }
  }

  function restoreActive() {
    if (!active) return;
    setArchivedIds((prev) => {
      const next = new Set(prev);
      next.delete(active.id);
      return next;
    });
  }

  function addTag(raw: string) {
    const t = raw.trim().toLowerCase().replace(/^#/, "");
    if (!t || !active || active.tags.includes(t)) return;
    updateActive({ tags: [...active.tags, t] });
  }

  function removeTag(t: string) {
    if (!active) return;
    updateActive({ tags: active.tags.filter((x) => x !== t) });
  }

  const sidebarContent = (
    <SidebarContents
      notes={notes}
      notebooks={notebooks}
      tags={allTags}
      archivedIds={archivedIds}
      userDisplayName={configRef.current?.displayName ?? configRef.current?.username ?? "User"}
      logoutUrl={configRef.current?.logoutUrl ?? "/logout/"}
      onRequestCreateNotebook={() => {
        setAssignNewNotebookToActive(false);
        setNotebookDialogOpen(true);
      }}
      filter={filter}
      setFilter={(f: FilterState) => {
        setFilter(f);
        setMobileNavOpen(false);
      }}
    />
  );

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background text-foreground">
      {(loadError || syncError) && (
        <div className="absolute top-3 left-1/2 z-50 -translate-x-1/2 rounded-md border border-destructive/40 bg-background px-3 py-2 text-xs text-destructive shadow">
          {loadError || syncError}
        </div>
      )}
      {/* Desktop sidebar */}
      <aside
        className={cn(
          "hidden md:flex flex-col border-r border-sidebar-border bg-sidebar transition-[width] duration-300 ease-out",
          sidebarOpen ? "w-64" : "w-0",
        )}
      >
        <div className={cn("flex flex-col h-full overflow-hidden w-64", !sidebarOpen && "invisible")}>
          {sidebarContent}
        </div>
      </aside>

      {/* Mobile sidebar */}
      <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
        <SheetContent side="left" className="p-0 w-72 bg-sidebar border-sidebar-border">
          <VisuallyHidden>
            <SheetTitle>Navigation</SheetTitle>
          </VisuallyHidden>
          <div className="flex flex-col h-full">{sidebarContent}</div>
        </SheetContent>
      </Sheet>

      {/* Mobile: sliding track. Desktop: normal flex row. */}
      <div className="flex-1 flex overflow-hidden relative min-w-0">
        <div
          className={cn(
            "flex h-full",
            // Mobile: each child is w-screen, so track is 200vw. Translate by -50% (= -100vw) to show detail.
            mobileView === "detail" ? "-translate-x-1/2" : "translate-x-0",
            "transition-transform duration-300 ease-out will-change-transform",
            // Desktop: track fills available space, no transform
            "md:w-full md:translate-x-0 md:transition-none",
          )}
        >
      {/* Note list */}
      <section
        className={cn(
          "w-screen md:w-[340px] shrink-0 border-r border-border flex flex-col bg-card/40 h-full",
        )}
      >
        <div className="px-5 pt-6 pb-3">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2 min-w-0">
              <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
                <SheetTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 md:hidden -ml-1"
                    aria-label="Open navigation"
                  >
                    <Menu className="h-4 w-4" />
                  </Button>
                </SheetTrigger>
              </Sheet>
              <div className="min-w-0">
              <h2 className="font-display text-2xl leading-tight">
                {filter.type === "all" && "All notes"}
                {filter.type === "starred" && "Starred"}
                {filter.type === "archive" && "Archive"}
                {filter.type === "notebook" &&
                  (filter.value === "__unassigned__" ? "Unassigned" : filter.value)}
                {filter.type === "tag" && `#${filter.value}`}
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                {filtered.length} {filtered.length === 1 ? "note" : "notes"}
              </p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 hidden md:inline-flex"
                onClick={() => setSidebarOpen((s) => !s)}
                aria-label="Toggle sidebar"
              >
                {sidebarOpen ? (
                  <PanelLeftClose className="h-4 w-4" />
                ) : (
                  <PanelLeft className="h-4 w-4" />
                )}
              </Button>
              {filter.type === "notebook" &&
                filter.value &&
                filter.value !== "__unassigned__" && (
                <>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => {
                      setRenameTarget(filter.value!);
                      setRenameDialogOpen(true);
                    }}
                    aria-label="Rename notebook"
                    title="Rename notebook"
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    onClick={() => {
                      setDeleteTarget(filter.value!);
                      setDeleteDialogOpen(true);
                    }}
                    aria-label="Delete notebook"
                    title="Delete notebook"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </>
              )}
              <Button size="icon" className="h-8 w-8" onClick={newNote} aria-label="New note">
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search notes…"
              className="pl-9 bg-background border-border h-9 rounded-lg"
            />
          </div>
        </div>

        <Separator />

        <ScrollArea className="flex-1">
          <ul className="px-3 py-3 space-y-1">
            {filtered.map((n) => {
              const isActive = active?.id === n.id;
              return (
                <li key={n.id}>
                  <button
                    onClick={() => {
                      setActiveId(n.id);
                      setMobileView("detail");
                    }}
                    className={cn(
                      "w-full text-left rounded-xl px-3 py-3 transition-all border border-transparent",
                      isActive
                        ? "bg-card border-border shadow-[0_1px_0_rgba(0,0,0,0.02),0_8px_24px_-16px_rgba(80,40,10,0.18)]"
                        : "hover:bg-card/70",
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="font-display text-[15px] leading-snug font-semibold truncate">
                        {n.title || "Untitled"}
                      </div>
                      {n.starred && (
                        <Star className="h-3.5 w-3.5 fill-primary text-primary shrink-0 mt-0.5" />
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2 mt-1 leading-relaxed">
                      {n.body.split("\n").join(" ") || "No additional text"}
                    </p>
                    <div className="flex items-center justify-between mt-2.5">
                      <span className="text-[11px] text-muted-foreground">
                        {formatTime(n.updatedAt)}
                      </span>
                      <div className="flex items-center gap-1">
                        {n.tags.slice(0, 2).map((t) => (
                          <Badge
                            key={t}
                            variant="secondary"
                            className="h-5 px-1.5 text-[10px] font-normal rounded-full bg-secondary/70"
                          >
                            {t}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </button>
                </li>
              );
            })}
            {filtered.length === 0 && (
              <li className="text-center text-sm text-muted-foreground py-12 px-4">
                Nothing here yet. Try a new search or{" "}
                <button onClick={newNote} className="underline underline-offset-2 text-foreground">
                  start a note
                </button>
                .
              </li>
            )}
          </ul>
        </ScrollArea>
      </section>

      {/* Editor */}
      <main
        className={cn(
          "w-screen shrink-0 md:w-auto md:flex-1 md:shrink flex flex-col bg-background h-full",
        )}
      >
        {active ? (
          <>
            <header className="flex items-center justify-between px-5 md:px-10 pt-6 md:pt-8 pb-4">
              <div className="flex items-center gap-2 text-xs text-muted-foreground min-w-0">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 md:hidden -ml-2"
                  onClick={() => setMobileView("list")}
                  aria-label="Back to list"
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <Notebook className="h-3.5 w-3.5" />
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      className="hover:text-foreground transition-colors underline-offset-4 hover:underline"
                      aria-label="Change notebook"
                    >
                      {active.notebook}
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-48">
                    {notebooks.map((nb) => (
                      <DropdownMenuItem
                        key={nb}
                        onClick={() => updateActive({ notebook: nb })}
                      >
                        <Notebook className="h-4 w-4 mr-2 opacity-60" />
                        <span className="flex-1">{nb}</span>
                        {active.notebook === nb && (
                          <span className="text-xs text-muted-foreground">current</span>
                        )}
                      </DropdownMenuItem>
                    ))}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => {
                        setAssignNewNotebookToActive(true);
                        setNotebookDialogOpen(true);
                      }}
                    >
                      <Plus className="h-4 w-4 mr-2 opacity-60" />
                      New notebook…
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                <span className="opacity-40">·</span>
                <span>Edited {formatTime(active.updatedAt)}</span>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => updateActive({ starred: !active.starred })}
                  aria-label="Star"
                >
                  <Star
                    className={cn(
                      "h-4 w-4",
                      active.starred ? "fill-primary text-primary" : "text-muted-foreground",
                    )}
                  />
                </Button>
                {archivedIds.has(active.id) ? (
                  <>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-foreground"
                      onClick={restoreActive}
                      aria-label="Restore note"
                      title="Restore"
                    >
                      <ArchiveRestore className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      onClick={archiveActive}
                      aria-label="Delete forever"
                      title="Delete forever"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </>
                ) : (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-foreground"
                    onClick={archiveActive}
                    aria-label="Archive note"
                    title="Archive"
                  >
                    <Archive className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </header>

            <ScrollArea className="flex-1">
              <div className="max-w-2xl mx-auto px-5 md:px-10 pb-20 pt-2">
                <input
                  value={active.title}
                  onChange={(e) => updateActive({ title: e.target.value })}
                  placeholder="Untitled"
                  className="font-display text-4xl md:text-5xl font-semibold tracking-tight w-full bg-transparent outline-none placeholder:text-muted-foreground/50 leading-tight"
                />

                <div className="flex flex-wrap items-center gap-1.5 mt-5">
                  {active.tags.map((t) => (
                    <button
                      key={t}
                      onClick={() => removeTag(t)}
                      className="group inline-flex items-center gap-0.5 rounded-full bg-accent/60 text-accent-foreground border border-border/60 px-2.5 py-0.5 text-xs hover:bg-destructive/15 hover:border-destructive/30 hover:text-destructive transition-colors"
                      aria-label={`Remove tag ${t}`}
                      title="Click to remove"
                    >
                      <Hash className="h-3 w-3 opacity-60 group-hover:hidden" />
                      <X className="h-3 w-3 hidden group-hover:inline" />
                      {t}
                    </button>
                  ))}
                  {addingTag ? (
                    <input
                      autoFocus
                      value={tagDraft}
                      onChange={(e) => setTagDraft(e.target.value)}
                      onBlur={() => {
                        addTag(tagDraft);
                        setTagDraft("");
                        setAddingTag(false);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          addTag(tagDraft);
                          setTagDraft("");
                          setAddingTag(false);
                        } else if (e.key === "Escape") {
                          setTagDraft("");
                          setAddingTag(false);
                        }
                      }}
                      placeholder="new tag"
                      className="h-6 px-2 text-xs rounded-full border border-border bg-background outline-none focus:ring-1 focus:ring-ring w-24"
                    />
                  ) : (
                    <button
                      onClick={() => setAddingTag(true)}
                      className="text-xs text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1 px-2 py-1"
                    >
                      <Plus className="h-3 w-3" /> tag
                    </button>
                  )}
                </div>

                <Textarea
                  value={active.body}
                  onChange={(e) => updateActive({ body: e.target.value })}
                  placeholder="Begin writing…"
                  className="mt-6 min-h-[60vh] resize-none border-0 bg-transparent px-0 text-[17px] leading-[1.75] focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-muted-foreground/50 shadow-none"
                />
              </div>
            </ScrollArea>

            <footer className="px-5 md:px-10 py-3 border-t border-border/60 flex items-center justify-between text-xs text-muted-foreground bg-card/30">
              <span>
                {active.body.split(/\s+/).filter(Boolean).length} words ·{" "}
                {active.body.length} characters
              </span>
              <span className="font-display italic">saved automatically</span>
            </footer>
          </>
        ) : (
          <div className="flex-1 grid place-items-center text-center px-8">
            <div>
              <div className="font-display text-3xl mb-2">A blank page is a kindness.</div>
              <p className="text-sm text-muted-foreground mb-6">
                Pick a note from the list, or start a new one.
              </p>
              <Button onClick={newNote}>
                <Plus className="h-4 w-4 mr-1.5" /> New note
              </Button>
            </div>
          </div>
        )}
      </main>
        </div>
      </div>

      <NewNotebookDialog
        open={notebookDialogOpen}
        onOpenChange={setNotebookDialogOpen}
        existing={notebooks}
        onCreate={(name) => {
          setNotebooks((nb) => (nb.includes(name) ? nb : [...nb, name].sort()));
          if (assignNewNotebookToActive && active) {
            updateActive({ notebook: name });
          }
          setFilter({ type: "notebook", value: name });
        }}
      />

      <NewNotebookDialog
        open={renameDialogOpen}
        onOpenChange={setRenameDialogOpen}
        existing={notebooks}
        mode="rename"
        initialName={renameTarget ?? ""}
        onCreate={() => {}}
        onRename={(name) => {
          if (!renameTarget) return;
          const old = renameTarget;
          setNotebooks((nb) => nb.map((x) => (x === old ? name : x)).sort());
          setNotes((p) => p.map((n) => (n.notebook === old ? { ...n, notebook: name } : n)));
          if (filter.type === "notebook" && filter.value === old) {
            setFilter({ type: "notebook", value: name });
          }
          setRenameTarget(null);
        }}
      />

      <DeleteNotebookDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        notebookName={deleteTarget ?? ""}
        noteCount={
          deleteTarget
            ? notes.filter((n) => n.notebook === deleteTarget && !archivedIds.has(n.id)).length
            : 0
        }
        otherNotebooks={notebooks.filter((nb) => nb !== deleteTarget)}
        onConfirm={(action: DeleteNotebookAction) => {
          if (!deleteTarget) return;
          const old = deleteTarget;
          setNotes((p) =>
            p.map((n) => {
              if (n.notebook !== old) return n;
              if (action.kind === "archive") return n;
              return {
                ...n,
                notebook: action.target === "__unassigned__" ? "Unassigned" : action.target,
              };
            }),
          );
          if (action.kind === "archive") {
            setArchivedIds((prev) => {
              const next = new Set(prev);
              for (const note of notes) {
                if (note.notebook === old) next.add(note.id);
              }
              return next;
            });
          }
          setNotebooks((nb) => nb.filter((x) => x !== old));
          if (filter.type === "notebook" && filter.value === old) {
            if (action.kind === "archive") {
              setFilter({ type: "all" });
            } else {
              setFilter({ type: "notebook", value: action.target });
            }
          }
          setDeleteTarget(null);
        }}
      />
    </div>
  );
}

function SidebarItem({
  icon: Icon,
  label,
  count,
  active,
  onClick,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  count?: number;
  active?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-md text-sm transition-colors",
        active
          ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
          : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground",
      )}
    >
      <span className="flex items-center gap-2.5 min-w-0">
        <Icon className="h-4 w-4 opacity-70" />
        <span className="truncate">{label}</span>
      </span>
      {typeof count === "number" && (
        <span className="text-[11px] text-muted-foreground tabular-nums">{count}</span>
      )}
    </button>
  );
}
function SidebarContents({
  notes,
  notebooks,
  tags,
  archivedIds,
  userDisplayName,
  logoutUrl,
  onRequestCreateNotebook,
  filter,
  setFilter,
}: {
  notes: Note[];
  notebooks: string[];
  tags: string[];
  archivedIds: Set<string>;
  userDisplayName: string;
  logoutUrl: string;
  onRequestCreateNotebook: () => void;
  filter: FilterState;
  setFilter: (f: FilterState) => void;
}) {
  return (
    <>
      <div className="px-5 pt-6 pb-4 flex items-center gap-2">
        <div className="h-8 w-8 rounded-lg bg-primary text-primary-foreground grid place-items-center shadow-sm">
          <Sparkles className="h-4 w-4" />
        </div>
        <div>
          <div className="font-display text-xl leading-none">Notes</div>
          <div className="text-[11px] text-muted-foreground tracking-wide uppercase mt-1">
            WeGotWorkSpace
          </div>
        </div>
      </div>

      <ScrollArea className="flex-1 px-3">
        <nav className="space-y-1 mt-2">
          <SidebarItem
            icon={Notebook}
            label="All notes"
            active={filter.type === "all"}
            onClick={() => setFilter({ type: "all" })}
            count={notes.length}
          />
          <SidebarItem
            icon={Star}
            label="Starred"
            active={filter.type === "starred"}
            onClick={() => setFilter({ type: "starred" })}
            count={notes.filter((n) => n.starred).length}
          />
          <SidebarItem
            icon={Archive}
            label="Archive"
            active={filter.type === "archive"}
            onClick={() => setFilter({ type: "archive" })}
            count={notes.filter((n) => archivedIds.has(n.id)).length}
          />
        </nav>

        <div className="mt-6 mb-2 px-2 flex items-center justify-between">
          <span className="text-[11px] uppercase tracking-wider text-muted-foreground">
            Notebooks
          </span>
          <button
            onClick={onRequestCreateNotebook}
            className="text-muted-foreground hover:text-foreground transition-colors"
            aria-label="New notebook"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        </div>
        <nav className="space-y-1">
          <SidebarItem
            icon={FileQuestion}
            label="Unassigned"
            count={notes.filter((n) => !n.notebook || !notebooks.includes(n.notebook)).length}
            active={filter.type === "notebook" && filter.value === "__unassigned__"}
            onClick={() => setFilter({ type: "notebook", value: "__unassigned__" })}
          />
          {notebooks.map((nb) => (
            <SidebarItem
              key={nb}
              icon={Notebook}
              label={nb}
              count={notes.filter((n) => n.notebook === nb).length}
              active={filter.type === "notebook" && filter.value === nb}
              onClick={() => setFilter({ type: "notebook", value: nb })}
            />
          ))}
        </nav>

        <div className="mt-6 mb-2 px-2">
          <span className="text-[11px] uppercase tracking-wider text-muted-foreground">Tags</span>
        </div>
        <div className="flex flex-wrap gap-1.5 px-2 pb-6">
          {tags.map((t) => (
            <button
              key={t}
              onClick={() => setFilter({ type: "tag", value: t })}
              className={cn(
                "inline-flex items-center gap-1 rounded-full border border-sidebar-border px-2.5 py-1 text-xs transition-colors",
                filter.type === "tag" && filter.value === t
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-card hover:bg-sidebar-accent text-sidebar-foreground",
              )}
            >
              <Hash className="h-3 w-3 opacity-60" />
              {t}
            </button>
          ))}
        </div>
      </ScrollArea>

      <div className="p-3 border-t border-sidebar-border">
        <div className="flex items-center gap-3 px-2 py-2 rounded-lg">
          <div className="h-8 w-8 rounded-full bg-accent grid place-items-center font-display text-sm">
            {(userDisplayName.trim().charAt(0) || "U").toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-medium truncate">{userDisplayName}</div>
            <a
              href={logoutUrl}
              className="mt-0.5 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <LogOut className="h-3 w-3" />
              Sign out
            </a>
          </div>
        </div>
      </div>
    </>
  );
}
