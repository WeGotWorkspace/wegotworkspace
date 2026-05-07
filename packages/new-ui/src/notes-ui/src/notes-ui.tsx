import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
} from "react";
import {
  Star,
  Archive,
  Plus,
  Pencil,
  Trash2,
  X,
  FolderInput,
  Folder,
  Tag as TagIcon,
  ArchiveRestore,
  StarOff,
} from "lucide-react";
import "react-swipeable-list/dist/styles.css";
import type { Note } from "@/lib/models/note";
import { useAppToast } from "@/hooks/use-app-toast";
import { useConfirmDialog } from "@/hooks/use-confirm-dialog";
import { useIsTouch } from "@/hooks/use-is-touch";
import { useSidebarListDrag } from "@/hooks/use-sidebar-list-drag";
import { useStarredMap } from "@/hooks/use-starred-map";
import { useWorkspaceListKeyboardShortcuts } from "@/hooks/use-workspace-list-keyboard-shortcuts";
import { useSelectableListState } from "@/hooks/use-selectable-list-state";
import { useEntityBatchActions } from "@/hooks/use-entity-batch-actions";
import { NoteDetailView } from "@/note-detail-view/src/note-detail-view";
import { ListAction, ToolbarButton } from "@/action-buttons/src/action-buttons";
import {
  MoveToDialog,
  AddDialog,
  EditDialog,
  DeleteDialog,
  TagPickerDialog,
} from "@/dialogs/src/dialogs";
import { WorkspaceApp, type WorkspaceAppHandle } from "@/workspace-app/src/workspace-app";
import { WorkspaceUserFooter } from "@/workspace-shell/src/workspace-app-layout";
import { FloatingActionBar } from "@/floating-action-bar/src/floating-action-bar";
import { ListHeader } from "@/list-header/src/list-header";
import { ListItem } from "@/list-item/src/list-item";
import { WorkspaceAppSwitcher } from "@/workspace-app-switcher/src/workspace-app-switcher";
import { AppSidebar } from "@/app-sidebar/src/app-sidebar";
import { SidebarSection } from "@/sidebar-section/src/sidebar-section";
import { ActionBar } from "@/action-bar/src/action-bar";
import { WorkspaceSwipeList } from "@/workspace-swipe-list/src/workspace-swipe-list";
import type { NotesSeedData } from "@/lib/adapters/notes-adapter";
import type { WorkspaceSession } from "@/lib/workspace/workspace-session";
import { workspaceUserInitials } from "@/lib/workspace/workspace-session";
import { mergeNotesLabels, type NotesUILabels } from "./notes-app.stories.fixtures";

export type NotesUIProps = {
  data: NotesSeedData;
  session: WorkspaceSession;
  labels?: Partial<NotesUILabels>;
  /** Logout link target, or `false` to omit navigation (e.g. Storybook). Default `/`. */
  logoutTo?: string | false;
};

export function NotesUI({ data, session, labels, logoutTo = "/" }: NotesUIProps) {
  const L = useMemo(() => mergeNotesLabels(labels), [labels]);
  const [notes, setNotes] = useState<Note[]>(() => data.notes);
  const [notebooks, setNotebooks] = useState<string[]>(() => data.notebooks);
  const [tags, setTags] = useState<string[]>(() => data.tags);
  const [activeId, setActiveId] = useState<string>(() => data.notes[0]?.id ?? "");
  const initialStarred = useMemo(() => {
    const m: Record<string, boolean> = {};
    for (const n of data.notes) {
      if (n.starred) m[n.id] = true;
    }
    return m;
  }, [data.notes]);
  const {
    starred,
    toggleStar: applyStarToggle,
    batchToggleStarForIds,
  } = useStarredMap(initialStarred);
  const [archived, setArchived] = useState<Record<string, boolean>>(() => {
    const m: Record<string, boolean> = {};
    for (const n of data.notes) {
      if (n.archived) m[n.id] = true;
    }
    return m;
  });
  const workspaceLayoutRef = useRef<WorkspaceAppHandle>(null);
  const [view, setView] = useState<string>("all");

  const [moveDialog, setMoveDialog] = useState<{ ids: string[] } | null>(null);
  const [addDialog, setAddDialog] = useState<null | "notebook" | "tag">(null);
  const [editDialog, setEditDialog] = useState<null | { kind: "notebook" | "tag"; name: string }>(
    null,
  );
  const [deleteDialog, setDeleteDialog] = useState<null | {
    kind: "notebook" | "tag";
    name: string;
  }>(null);
  const [tagDialog, setTagDialog] = useState<null | { noteId: string }>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  const { show } = useAppToast();
  const { confirmDialog, requestConfirm } = useConfirmDialog();

  const isTouch = useIsTouch();

  const visibleNotes = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return notes.filter((n) => {
      let inView = true;
      if (view === "all") inView = !archived[n.id];
      else if (view === "starred") inView = !!starred[n.id] && !archived[n.id];
      else if (view === "archive") inView = !!archived[n.id];
      else if (view.startsWith("nb:")) {
        const want = view.slice(3);
        inView =
          (n.notebook === want || n.notebook.toLowerCase() === want.toLowerCase()) &&
          !archived[n.id];
      } else if (view.startsWith("tag:"))
        inView = n.tags.includes(view.slice(4)) && !archived[n.id];
      if (!inView) return false;
      if (!q) return true;
      const hay =
        `${n.title} ${n.excerpt} ${n.body.join(" ")} ${n.notebook} ${n.tags.join(" ")}`.toLowerCase();
      return hay.includes(q);
    });
  }, [notes, view, starred, archived, searchQuery]);

  const viewLabel = useMemo(() => {
    if (view === "all") return L.sidebarAllItems;
    if (view === "starred") return L.sidebarStarred;
    if (view === "archive") return L.sidebarArchive;
    if (view.startsWith("nb:")) return view.slice(3);
    if (view.startsWith("tag:")) return L.tagViewTitle(view.slice(4));
    return L.fallbackViewTitle;
  }, [view, L]);

  const {
    selectedIds,
    setSelectedIds,
    selectionMode,
    setSelectionMode,
    handleSelect,
    enterSelectionFor,
    exitSelection,
    selectSingle,
  } = useSelectableListState({
    initialId: data.notes[0]?.id,
    visibleIds: visibleNotes.map((n) => n.id),
    onPrimarySelect: (id) => {
      setActiveId(id);
      workspaceLayoutRef.current?.openMobileDetail();
    },
  });

  useEffect(() => {
    setSelectedIds([]);
    setSelectionMode(false);
  }, [view, setSelectedIds, setSelectionMode]);

  const { isItemDragging, itemDragHandlers, sidebarDropZoneProps } =
    useSidebarListDrag(selectedIds);

  const active: Note | undefined =
    notes.length > 0 ? (notes.find((n) => n.id === activeId) ?? notes[0]) : undefined;
  const { beginOptimisticUpdate } = useEntityBatchActions<Note>({
    items: notes,
    setItems: setNotes,
    visibleIds: visibleNotes.map((n) => n.id),
    activeId,
    setActiveId,
  });

  const toggleStar = (id: string) => {
    const nowStarred = applyStarToggle(id);
    show(nowStarred ? "Starred" : "Unstarred", {
      icon: nowStarred ? (
        <Star className="size-4" fill="currentColor" />
      ) : (
        <StarOff className="size-4" />
      ),
    });
  };
  const toggleArchive = (id: string) => {
    setArchived((s) => {
      const next = !s[id];
      show(next ? "Archived" : "Unarchived", {
        icon: next ? <Archive className="size-4" /> : <ArchiveRestore className="size-4" />,
      });
      return { ...s, [id]: next };
    });
  };

  const batchStar = () => {
    const r = batchToggleStarForIds(selectedIds);
    if (!r) return;
    show(
      `${r.allWereStarred ? "Unstarred" : "Starred"} ${r.count} item${r.count === 1 ? "" : "s"}`,
      {
        icon: r.allWereStarred ? (
          <StarOff className="size-4" />
        ) : (
          <Star className="size-4" fill="currentColor" />
        ),
      },
    );
  };
  const batchArchive = () => {
    setArchived((s) => {
      const allArch = selectedIds.every((id) => s[id]);
      const next = { ...s };
      selectedIds.forEach((id) => (next[id] = !allArch));
      show(
        `${allArch ? "Unarchived" : "Archived"} ${selectedIds.length} item${selectedIds.length === 1 ? "" : "s"}`,
        {
          icon: allArch ? <ArchiveRestore className="size-4" /> : <Archive className="size-4" />,
        },
      );
      return next;
    });
  };

  const moveToNotebook = (ids: string[], nb: string) => {
    beginOptimisticUpdate({
      ids,
      updater: (note) => ({ ...note, notebook: nb }),
    });
    show(`Moved ${ids.length} item${ids.length === 1 ? "" : "s"} to “${nb}”`, {
      icon: <FolderInput className="size-4" />,
    });
  };

  const addNotebook = (name: string) => {
    const v = name.trim();
    if (!v || notebooks.includes(v)) return;
    setNotebooks((p) => [...p, v]);
    show(`Notebook “${v}” created`, { icon: <Folder className="size-4" /> });
  };
  const addTag = (name: string) => {
    const v = name.trim().replace(/^#/, "");
    if (!v || tags.includes(v)) return;
    setTags((p) => [...p, v]);
    show(`Tag #${v} created`, { icon: <TagIcon className="size-4" /> });
  };
  const renameNotebook = (oldName: string, newName: string) => {
    const v = newName.trim();
    if (!v || (v !== oldName && notebooks.includes(v))) return;
    setNotebooks((p) => p.map((n) => (n === oldName ? v : n)));
    setNotes((p) => p.map((n) => (n.notebook === oldName ? { ...n, notebook: v } : n)));
    if (view === `nb:${oldName}`) setView(`nb:${v}`);
    show(`Renamed to “${v}”`, { icon: <Pencil className="size-4" /> });
  };
  const renameTag = (oldName: string, newName: string) => {
    const v = newName.trim().replace(/^#/, "");
    if (!v || (v !== oldName && tags.includes(v))) return;
    setTags((p) => p.map((t) => (t === oldName ? v : t)));
    setNotes((p) => p.map((n) => ({ ...n, tags: n.tags.map((t) => (t === oldName ? v : t)) })));
    if (view === `tag:${oldName}`) setView(`tag:${v}`);
    show(`Renamed to #${v}`, { icon: <Pencil className="size-4" /> });
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
    show(`Notebook “${name}” deleted`, { icon: <Trash2 className="size-4" /> });
  };
  const deleteTag = (name: string) => {
    setTags((p) => p.filter((t) => t !== name));
    setNotes((p) => p.map((n) => ({ ...n, tags: n.tags.filter((t) => t !== name) })));
    if (view === `tag:${name}`) setView("all");
    show(`Tag #${name} deleted`, { icon: <Trash2 className="size-4" /> });
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
    show(added ? `Added #${tag}` : `Removed #${tag}`, { icon: <TagIcon className="size-4" /> });
  };

  const deleteSelectedNotes = useCallback(
    (ids?: string[]) => {
      const target = ids ?? selectedIds;
      if (target.length === 0) return;
      const count = target.length;
      setNotes((p) => p.filter((n) => !target.includes(n.id)));
      setSelectedIds((prev) => prev.filter((id) => !target.includes(id)));
      if (target.length === selectedIds.length) setSelectionMode(false);
      show(`Deleted ${count} item${count === 1 ? "" : "s"}`, {
        icon: <Trash2 className="size-4" />,
      });
    },
    [selectedIds, show, setSelectedIds, setSelectionMode],
  );

  const openDeleteConfirm = useCallback(
    (ids: string[], mode: "selected" | "all") => {
      requestConfirm({
        title: mode === "all" ? L.dialogEmptyArchiveTitle : L.dialogDeleteItemsTitle(ids.length),
        description: `${L.dialogPermanentDeleteLeadIn}${
          mode === "all"
            ? L.dialogEmptyArchiveDescription(ids.length)
            : L.dialogDeleteSelectedDescription
        }. ${L.dialogDeleteConfirmSuffix}`,
        confirmLabel: L.dialogDelete,
        cancelLabel: L.dialogCancel,
        variant: "destructive",
        onConfirm: () => deleteSelectedNotes(ids),
      });
    },
    [L, requestConfirm, deleteSelectedNotes],
  );

  const requestDeleteSelected = useCallback(() => {
    if (selectedIds.length === 0) return;
    if (view === "archive") {
      openDeleteConfirm(selectedIds, "selected");
    } else {
      setArchived((s) => {
        const next = { ...s };
        selectedIds.forEach((id) => (next[id] = true));
        return next;
      });
      show(`Archived ${selectedIds.length} item${selectedIds.length === 1 ? "" : "s"}`, {
        icon: <Archive className="size-4" />,
      });
    }
  }, [selectedIds, view, openDeleteConfirm, show]);

  useWorkspaceListKeyboardShortcuts({
    searchInputRef,
    selectedCount: selectedIds.length,
    onRequestDeleteSelection: requestDeleteSelected,
  });

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
    const date = now.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
    const note: Note = {
      id,
      category: L.newNoteCategory,
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
    selectSingle(id);
    workspaceLayoutRef.current?.openMobileDetail();
    show(L.toastNewNote, { icon: <Plus className="size-4" /> });
  };

  const selectedNotebook = view.startsWith("nb:") ? view.slice(3) : null;
  const selectedTag = view.startsWith("tag:") ? view.slice(4) : null;
  const canEditDelete = !!(selectedNotebook || selectedTag);

  const selectView = (v: string) => {
    setView(v);
    workspaceLayoutRef.current?.closeMobileDetail();
    if (typeof window !== "undefined" && window.matchMedia("(max-width: 767px)").matches) {
      workspaceLayoutRef.current?.closeSidebar();
    }
  };

  const selectionBarButtons = [
    { label: L.selectionStar, icon: <Star className="size-4" />, onClick: batchStar },
    ...(view !== "archive"
      ? [{ label: L.selectionArchive, icon: <Archive className="size-4" />, onClick: batchArchive }]
      : []),
    {
      label: L.selectionMoveToNotebook,
      icon: <FolderInput className="size-4" />,
      onClick: () => setMoveDialog({ ids: selectedIds }),
    },
    ...(view === "archive"
      ? [
          {
            label: L.selectionDeletePermanently,
            icon: <Trash2 className="size-4" />,
            onClick: requestDeleteSelected,
          },
        ]
      : []),
    {
      label: L.selectionDone,
      icon: <X className="size-4" />,
      onClick: () => exitSelection(activeId),
    },
  ];

  const selectionBar =
    selectionMode || selectedIds.length > 1 ? (
      <FloatingActionBar items={selectedIds.length} buttons={selectionBarButtons} />
    ) : null;

  return (
    <>
      <WorkspaceApp
        ref={workspaceLayoutRef}
        workspaceRoot={{
          style: {
            ["--workspace-root-bg" as string]: "var(--color-paper)",
            ["--app-sidebar-bg" as string]: "var(--color-paper)",
            ["--app-sidebar-border-color" as string]:
              "color-mix(in oklab, var(--color-ink) 15%, transparent)",
            ["--app-sidebar-brand-fill" as string]: "var(--color-ink)",
            ["--app-sidebar-close-button-color" as string]: "var(--color-ink)",
            ["--workspace-user-footer-text-color" as string]:
              "color-mix(in oklab, var(--color-ink) 70%, transparent)",
            ["--workspace-user-footer-border-color" as string]:
              "color-mix(in oklab, var(--color-ink) 10%, transparent)",
            ["--workspace-user-footer-avatar-bg" as string]:
              "color-mix(in oklab, var(--color-ink) 12%, transparent)",
            ["--workspace-user-footer-avatar-color" as string]: "var(--color-ink)",
            ["--workspace-user-footer-link-color" as string]:
              "color-mix(in oklab, var(--color-ink) 65%, transparent)",
            ["--workspace-user-footer-link-bg" as string]:
              "color-mix(in oklab, var(--color-ink) 6%, transparent)",
          },
        }}
        sidebar={(c) => (
          <AppSidebar
            open={c.sidebarOpen}
            onCloseMobile={c.closeSidebar}
            appSwitcher={<WorkspaceAppSwitcher />}
          >
            <nav className="flex-1 px-4 space-y-7 overflow-y-auto">
              <SidebarSection
                items={[
                  {
                    label: L.sidebarAllItems,
                    selected: view === "all",
                    onClick: () => selectView("all"),
                  },
                  {
                    label: L.sidebarStarred,
                    selected: view === "starred",
                    onClick: () => selectView("starred"),
                  },
                  {
                    label: L.sidebarArchive,
                    selected: view === "archive",
                    onClick: () => selectView("archive"),
                  },
                ]}
              />

              <SidebarSection
                title={L.sectionNotebooks}
                onAdd={() => setAddDialog("notebook")}
                addLabel={L.addNotebook}
                items={notebooks.map((nb) => ({
                  label: nb,
                  selected: view === `nb:${nb}`,
                  onClick: () => selectView(`nb:${nb}`),
                  ...sidebarDropZoneProps(`nb:${nb}`, (ids) => moveToNotebook(ids, nb)),
                }))}
              />

              <SidebarSection
                title={L.sectionTags}
                onAdd={() => setAddDialog("tag")}
                addLabel={L.addTag}
                items={tags.map((t) => ({
                  label: `#${t}`,
                  selected: view === `tag:${t}`,
                  onClick: () => selectView(`tag:${t}`),
                  ...sidebarDropZoneProps(`tag:${t}`, (ids) => {
                    setNotes((prev) =>
                      prev.map((n) =>
                        ids.includes(n.id) && !n.tags.includes(t)
                          ? { ...n, tags: [...n.tags, t] }
                          : n,
                      ),
                    );
                    show(`Tagged ${ids.length} item${ids.length === 1 ? "" : "s"} with #${t}`, {
                      icon: <TagIcon className="size-4" />,
                    });
                  }),
                }))}
              />
            </nav>

            <WorkspaceUserFooter
              name={session.user.displayName}
              initials={workspaceUserInitials(session.user)}
              logoutTo={logoutTo}
              linkHoverClassName="hover:bg-[color-mix(in_oklab,var(--color-ink)_18%,transparent)] hover:text-[var(--color-ink)]"
            />
          </AppSidebar>
        )}
        list={(c) => ({
          header: (
            <ListHeader
              sidebarOpen={c.sidebarOpen}
              onToggleSidebar={c.toggleSidebar}
              title={viewLabel}
              subtitle={
                selectionMode || selectedIds.length > 1
                  ? L.listSelected(selectedIds.length)
                  : L.listFiles(visibleNotes.length)
              }
              actions={
                <>
                  <ListAction label={L.newNote} onClick={createNote} disabled={!canCreateNote}>
                    <Plus className="size-4" />
                  </ListAction>
                  {canEditDelete ? (
                    <>
                      <ListAction
                        label={L.edit}
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
                        label={L.remove}
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
                  ) : null}
                  {view === "archive" && visibleNotes.length > 0 ? (
                    <ListAction
                      label={L.emptyArchive}
                      onClick={() =>
                        openDeleteConfirm(
                          visibleNotes.map((n) => n.id),
                          "all",
                        )
                      }
                    >
                      <Trash2 className="size-4" />
                    </ListAction>
                  ) : null}
                </>
              }
              searchPlaceholder={L.searchPlaceholder}
              searchValue={searchQuery}
              onSearchInput={setSearchQuery}
              searchInputRef={searchInputRef}
            />
          ),
          listContent: (
            <WorkspaceSwipeList isTouch={isTouch}>
              {visibleNotes.map((note) => (
                <ListItem
                  key={note.id}
                  id={note.id}
                  title={note.title}
                  subtitle={note.notebook}
                  date={note.date}
                  text={note.excerpt}
                  icons={[
                    <Star
                      key="star"
                      className="size-3 transition-opacity"
                      fill="currentColor"
                      style={{
                        color: "var(--color-emerald)",
                        opacity: starred[note.id] ? 1 : 0,
                      }}
                    />,
                  ]}
                  isActive={note.id === activeId}
                  isSelected={selectedIds.includes(note.id)}
                  selectionMode={selectionMode}
                  isTouch={isTouch}
                  isDragging={isItemDragging(note.id)}
                  onClick={(e: ReactMouseEvent) => handleSelect(note.id, e)}
                  onLongPress={() => enterSelectionFor(note.id)}
                  {...itemDragHandlers(note.id)}
                  {...(isTouch
                    ? {
                        swipeLeftAction: {
                          icon: (
                            <Star
                              className="size-5"
                              fill={starred[note.id] ? "currentColor" : "none"}
                            />
                          ),
                          color: "var(--color-emerald)",
                          label: starred[note.id] ? L.swipeUnstar : L.swipeStar,
                          onActivate: () => toggleStar(note.id),
                        },
                        swipeRightAction: {
                          icon: <Archive className="size-5" />,
                          color: "var(--color-ink)",
                          label: archived[note.id] ? L.swipeUnarchive : L.swipeArchive,
                          destructive: true,
                          onActivate: () => toggleArchive(note.id),
                        },
                      }
                    : {})}
                />
              ))}
            </WorkspaceSwipeList>
          ),
          hasItems: visibleNotes.length > 0,
          emptyLabel: L.emptyList,
          floatingActionBar: selectionBar,
        })}
        actionBar={(c) =>
          active ? (
            <ActionBar
              onBack={c.closeMobileDetail}
              right={
                <>
                  <ToolbarButton
                    label={L.toolbarMoveToNotebook}
                    onClick={() => setMoveDialog({ ids: [active.id] })}
                  >
                    <FolderInput className="size-4" />
                  </ToolbarButton>
                  <ToolbarButton
                    label={L.toolbarStar}
                    onClick={() => toggleStar(active.id)}
                    active={!!starred[active.id]}
                  >
                    <Star className="size-4" fill={starred[active.id] ? "currentColor" : "none"} />
                  </ToolbarButton>
                  <ToolbarButton
                    label={archived[active.id] ? L.toolbarUnarchive : L.toolbarArchive}
                    onClick={() => toggleArchive(active.id)}
                    active={!!archived[active.id]}
                  >
                    {archived[active.id] ? (
                      <ArchiveRestore className="size-4" />
                    ) : (
                      <Archive className="size-4" />
                    )}
                  </ToolbarButton>
                </>
              }
            />
          ) : (
            <ActionBar onBack={c.closeMobileDetail} />
          )
        }
        detail={() =>
          active ? (
            <NoteDetailView
              noteId={active.id}
              notebook={active.notebook}
              lastEdited={active.date}
              title={active.title}
              onTitleChange={(v) => updateNote(active.id, { title: v })}
              tags={active.tags}
              onTagAdd={() => setTagDialog({ noteId: active.id })}
              onTagRemove={(t) => toggleNoteTag(active.id, t)}
              pullQuote={active.pullQuote}
              body={active.body}
              onBodyParagraphChange={(i, v) => {
                const next = [...active.body];
                next[i] = v;
                updateNote(active.id, { body: next });
              }}
            />
          ) : (
            <div
              className="flex flex-1 items-center justify-center p-8 text-sm text-[color-mix(in_oklab,var(--color-ink)_55%,transparent)]"
              style={{ backgroundColor: "var(--color-paper)" }}
            >
              {notes.length === 0 ? L.emptyList : "Select an item."}
            </div>
          )
        }
      />

      <MoveToDialog
        open={!!moveDialog}
        notebooks={notebooks}
        currentNotebook={
          moveDialog?.ids.length === 1
            ? notes.find((n) => n.id === moveDialog.ids[0])?.notebook
            : undefined
        }
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
        selected={tagDialog ? (notes.find((n) => n.id === tagDialog.noteId)?.tags ?? []) : []}
        onClose={() => setTagDialog(null)}
        onToggle={(t) => {
          if (tagDialog) toggleNoteTag(tagDialog.noteId, t);
        }}
        onCreate={(t) => {
          addTag(t);
          if (tagDialog) toggleNoteTag(tagDialog.noteId, t.trim().replace(/^#/, ""));
        }}
      />

      {confirmDialog}
    </>
  );
}
